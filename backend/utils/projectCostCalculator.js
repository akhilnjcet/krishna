const BillOfMaterials = require('../models/BillOfMaterials');
const MaterialConsumption = require('../models/MaterialConsumption');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const Project = require('../models/Project');
const Quote = require('../models/Quote');

/**
 * Calculates complete project costing, actual vs estimated breakdowns, 
 * profitability, and cost variance for a given project.
 */
async function calculateProjectCosting(projectId) {
    const project = await Project.findById(projectId).populate('customerId', 'name email phone');
    if (!project) {
        throw new Error('Project not found');
    }

    // 1. Fetch active or latest BOM
    const bom = await BillOfMaterials.findOne({ projectId: project._id, status: { $ne: 'Archived' } }).sort({ version: -1 });

    // 2. Fetch all Material Consumptions for this project
    const consumptions = await MaterialConsumption.find({ projectId: project._id });

    let actualMaterialConsumedCost = 0;
    let actualMaterialReturnedCost = 0;
    let totalItemsIssued = 0;
    let totalItemsConsumed = 0;
    let totalItemsReturned = 0;
    let totalItemsWastage = 0;

    consumptions.forEach(c => {
        const cost = Number(c.totalCost) || 0;
        const qty = Number(c.quantity) || 0;
        if (c.movementType === 'CONSUMPTION') {
            actualMaterialConsumedCost += cost;
            totalItemsConsumed += qty;
        } else if (c.movementType === 'RETURN') {
            actualMaterialReturnedCost += cost;
            totalItemsReturned += qty;
        } else if (c.movementType === 'ISSUE') {
            totalItemsIssued += qty;
        } else if (c.movementType === 'WASTAGE') {
            totalItemsWastage += qty;
        }
    });

    const netBiometricMaterialCost = Math.max(0, actualMaterialConsumedCost - actualMaterialReturnedCost);

    // 3. Fetch linked Direct Expenses from Finance system (Avoid duplicate counting)
    const directExpenses = await Expense.find({ projectId: project._id, type: 'expense' });

    let directMaterialExpense = 0;
    let directLabourExpense = 0;
    let directTransportExpense = 0;
    let directOtherExpense = 0;

    directExpenses.forEach(exp => {
        const amt = Number(exp.amount) || 0;
        if (exp.costType === 'material' || exp.category === 'material') {
            directMaterialExpense += amt;
        } else if (exp.costType === 'labour' || exp.category === 'staff') {
            directLabourExpense += amt;
        } else if (exp.costType === 'transportation' || exp.category === 'fuel') {
            directTransportExpense += amt;
        } else {
            directOtherExpense += amt;
        }
    });

    // Total Component Costs
    const totalMaterialCost = parseFloat((netBiometricMaterialCost + directMaterialExpense).toFixed(2));
    const totalLabourCost = parseFloat(directLabourExpense.toFixed(2));
    const totalTransportationCost = parseFloat(directTransportExpense.toFixed(2));
    const totalOtherCost = parseFloat(directOtherExpense.toFixed(2));

    const actualTotalCost = parseFloat((
        totalMaterialCost + 
        totalLabourCost + 
        totalTransportationCost + 
        totalOtherCost
    ).toFixed(2));

    // 4. Quotation, Approved Project Value & Revenue
    let quotationValue = 0;
    // Check if quote was linked to this project or customer
    if (project.customerId) {
        const linkedQuote = await Quote.findOne({ 
            $or: [
                { userId: project.customerId._id || project.customerId },
                { name: project.customerId.name }
            ] 
        }).sort({ createdAt: -1 });
        if (linkedQuote && linkedQuote.estimatedCost) {
            quotationValue = Number(linkedQuote.estimatedCost) || 0;
        }
    }
    if (!quotationValue) {
        quotationValue = Number(project.budget) || 0;
    }

    // Approved Additional Work
    let approvedAdditionalWorkTotal = 0;
    if (Array.isArray(project.additionalWork)) {
        project.additionalWork.forEach(w => {
            if (w.status === 'Approved') {
                approvedAdditionalWorkTotal += Number(w.amount) || 0;
            }
        });
    }

    const approvedProjectValue = parseFloat(((Number(project.budget) || 0) + approvedAdditionalWorkTotal).toFixed(2));

    // 5. Payment Collections & Outstanding
    const projectPayments = await Payment.find({
        projectId: project._id,
        status: { $in: ['Completed', 'Verified'] }
    });

    const totalAmountReceived = parseFloat((
        projectPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) +
        (Number(project.advancePaid) || 0) +
        (Number(project.paidCash) || 0) +
        (Number(project.paidOnline) || 0)
    ).toFixed(2));

    const outstandingAmount = Math.max(0, parseFloat((approvedProjectValue - totalAmountReceived).toFixed(2)));

    // 6. Estimated Costs from BOM
    const estimatedMaterialCost = bom ? Number(bom.totalEstimatedMaterialCost) || 0 : 0;
    const estimatedLabourCost = bom ? Number(bom.estimatedLabourCost) || 0 : 0;
    const estimatedTransportCost = bom ? Number(bom.estimatedTransportCost) || 0 : 0;
    const estimatedOtherCost = bom ? Number(bom.estimatedOtherCost) || 0 : 0;
    const estimatedTotalCost = bom ? Number(bom.totalEstimatedCost) || 0 : (Number(project.budget) || 0);

    // 7. Profitability & Variances
    // Recognized revenue: for completed/delivered projects, recognized is approvedProjectValue;
    // otherwise recognized earned revenue can be the actual collected or proportional value.
    const isCompleted = ['completed', 'Completed'].includes(project.status);
    const recognizedRevenue = isCompleted ? approvedProjectValue : Math.max(totalAmountReceived, (approvedProjectValue * (Number(project.progress) || 0)) / 100);

    const actualProfit = parseFloat((recognizedRevenue - actualTotalCost).toFixed(2));
    const expectedProfit = parseFloat((approvedProjectValue - estimatedTotalCost).toFixed(2));

    const actualProfitMargin = recognizedRevenue > 0 
        ? parseFloat(((actualProfit / recognizedRevenue) * 100).toFixed(2))
        : 0;
    const expectedProfitMargin = approvedProjectValue > 0 
        ? parseFloat(((expectedProfit / approvedProjectValue) * 100).toFixed(2))
        : 0;

    const costVariance = parseFloat((actualTotalCost - estimatedTotalCost).toFixed(2));
    const isCostOverrun = actualTotalCost > estimatedTotalCost;
    const warningThreshold = bom ? (bom.warningThresholdPercentage || 100) : 100;
    const costUsagePercentage = estimatedTotalCost > 0 
        ? parseFloat(((actualTotalCost / estimatedTotalCost) * 100).toFixed(2))
        : 0;
    const isBudgetWarningTriggered = costUsagePercentage >= warningThreshold;

    // 8. Wastage Summary
    const wastageQty = totalItemsWastage;
    const wastagePercentage = (totalItemsConsumed + totalItemsWastage) > 0 
        ? parseFloat(((totalItemsWastage / (totalItemsConsumed + totalItemsWastage)) * 100).toFixed(2))
        : 0;

    return {
        project: {
            id: project._id,
            title: project.title,
            serviceType: project.serviceType,
            status: project.status,
            progress: project.progress,
            customer: project.customerId,
            deadline: project.deadline
        },
        bom: bom ? {
            id: bom._id,
            bomNumber: bom.bomNumber,
            version: bom.version,
            status: bom.status,
            itemCount: bom.items.length
        } : null,
        estimates: {
            materialCost: estimatedMaterialCost,
            labourCost: estimatedLabourCost,
            transportCost: estimatedTransportCost,
            otherCost: estimatedOtherCost,
            totalCost: estimatedTotalCost,
            expectedProfit,
            expectedProfitMargin
        },
        actuals: {
            materialCost: totalMaterialCost,
            labourCost: totalLabourCost,
            transportCost: totalTransportationCost,
            otherCost: totalOtherCost,
            totalCost: actualTotalCost,
            recognizedRevenue,
            actualProfit,
            actualProfitMargin
        },
        financials: {
            quotationValue,
            approvedProjectValue,
            advancePaid: Number(project.advancePaid) || 0,
            totalAmountReceived,
            outstandingAmount,
            costVariance,
            costUsagePercentage,
            isCostOverrun,
            isBudgetWarningTriggered,
            warningThreshold
        },
        wastage: {
            totalItemsIssued,
            totalItemsConsumed,
            totalItemsReturned,
            totalItemsWastage,
            wastagePercentage
        }
    };
}

module.exports = {
    calculateProjectCosting
};
