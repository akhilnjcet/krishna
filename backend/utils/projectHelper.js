const Project = require('../models/Project');
const Payment = require('../models/Payment');
const socketUtil = require('./socket');

/**
 * Recalculates and updates the financial status of a project.
 * Sums up all approved cash and online payments, adds the advance paid and discount,
 * updates the project document, and broadcasts the update via Socket.IO in real-time.
 * 
 * @param {string} projectId - The ID of the project to tally
 */
async function recalculateProjectPaymentStatus(projectId) {
    if (!projectId) return null;
    try {
        const project = await Project.findById(projectId);
        if (!project) {
            console.error(`Project Helper: Project not found for ID: ${projectId}`);
            return null;
        }

        // Find all completed/verified payments for this project
        const completedPayments = await Payment.find({
            projectId: projectId,
            status: { $in: ['verified', 'Completed'] }
        });

        // Sum payments by cash and online methods
        let paidCash = 0;
        let paidOnline = 0;
        completedPayments.forEach(p => {
            if (p.method === 'cash') {
                paidCash += p.amount;
            } else {
                paidOnline += p.amount;
            }
        });

        const advancePaid = project.advancePaid || 0;
        const discount = project.discount || 0;
        const budget = project.budget || 0;
        const totalPaid = paidCash + paidOnline + advancePaid;

        const approvedAdditionalWorkTotal = project.additionalWork
            ? project.additionalWork
                .filter(w => w.status === 'Approved')
                .reduce((sum, w) => sum + (w.amount || 0), 0)
            : 0;
        const totalCost = budget + approvedAdditionalWorkTotal;

        let paymentStatus = 'unpaid';
        if (totalPaid === 0) {
            paymentStatus = 'unpaid';
        } else if (totalPaid + discount >= totalCost) {
            paymentStatus = 'fully-paid';
        } else {
            paymentStatus = 'partially-paid';
        }

        // Update the project document fields
        project.paidCash = paidCash;
        project.paidOnline = paidOnline;
        project.paymentStatus = paymentStatus;
        const updatedProject = await project.save();

        // Broadcast updates via Socket.IO
        const io = socketUtil.getIO();
        if (io) {
            io.emit('project-updated', {
                projectId: updatedProject._id,
                customerId: updatedProject.customerId,
                paymentStatus: updatedProject.paymentStatus,
                totalPaid,
                paidCash: updatedProject.paidCash,
                paidOnline: updatedProject.paidOnline,
                discount: updatedProject.discount,
                advancePaid: updatedProject.advancePaid,
                budget: updatedProject.budget,
                totalCost,
                approvedAdditionalWorkTotal
            });
        }

        console.log(`📊 Project Helper: Recalculated payment status for project "${updatedProject.title}": ${paymentStatus} (Total Paid: ₹${totalPaid}, Discount: ₹${discount}, Budget: ₹${budget})`);
        return updatedProject;
    } catch (err) {
        console.error('Error recalculating project payment status:', err);
        return null;
    }
}

module.exports = {
    recalculateProjectPaymentStatus
};
