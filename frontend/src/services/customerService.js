import { doc, getDoc, setDoc, updateDoc, serverTimestamp, waitForPendingWrites } from "firebase/firestore";
import { db } from "./firebase";

/**
 * INDUSTRIAL-GRADE PERSISTENCE LAYER:
 * Mobile number is the only unique identifier (Document ID).
 * This service now includes fail-safe network guards.
 */

export const customerService = {
  // 1. Get or Create Customer
  checkInCustomer: async (mobileNumber, details = null) => {
    if (!mobileNumber) throw new Error("Mobile number required");
    
    try {
        // Normalize mobile (remove spaces/dashes)
        const phone = mobileNumber.replace(/\D/g, '');
        const customerRef = doc(db, "customers", phone);
        
        const docSnap = await getDoc(customerRef);
        
        // Generate a temporary 4-digit password for THIS check-in
        const tempPassword = Math.floor(1000 + Math.random() * 9000).toString();

        let result;
        if (docSnap.exists()) {
          // Load existing details and update only the check-in info
          await updateDoc(customerRef, {
            tempPassword,
            lastCheckIn: serverTimestamp()
          });
          result = { 
            status: 'existing', 
            data: { ...docSnap.data(), tempPassword } 
          };
        } else {
          // Create new record
          if (!details) throw new Error("Details required for new customer");
          
          const newCustomer = {
            mobile: phone,
            name: details.name,
            address: details.address,
            idType: details.idType,
            idNumber: details.idNumber,
            tempPassword,
            createdAt: serverTimestamp(),
            lastCheckIn: serverTimestamp(),
          };
          
          await setDoc(customerRef, newCustomer);
          result = { status: 'new', data: newCustomer };
        }

        // FAIL-SAFE: Verify data is saved to local cache at minimum
        try { await waitForPendingWrites(db); } catch(e) { console.warn("Background Sync Active"); }
        
        return result;
    } catch (err) {
        console.error("Database Signal Failure:", err);
        throw new Error("System is currently syncing or offline. Please check internet.");
    }
  },

  // 2. Fetch Customer Details
  getCustomer: async (mobileNumber) => {
    try {
        const phone = mobileNumber.replace(/\D/g, '');
        const docSnap = await getDoc(doc(db, "customers", phone));
        return docSnap.exists() ? docSnap.data() : null;
    } catch (err) {
        return null; // Silent fail for lookup to allow entry
    }
  },

  // 3. Get All Customers (Booking History)
  getAllCustomers: async () => {
    try {
        const { getDocs, collection, query, orderBy } = await import("firebase/firestore");
        const q = query(collection(db, "customers"), orderBy("lastCheckIn", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
        console.error("History Retrieval Failure:", err);
        return [];
    }
  },

  // 4. Update Customer Profile
  updateCustomer: async (mobileNumber, updates) => {
    const phone = mobileNumber.replace(/\D/g, '');
    const customerRef = doc(db, "customers", phone);
    await updateDoc(customerRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    // Ensure persistence
    try { await waitForPendingWrites(db); } catch(e) {}
    return true;
  },

  // 5. Search Customers (Prefix Matching)

  searchCustomers: async (qString) => {
    if (!qString || qString.length < 3) return [];
    try {
        const { getDocs, collection, query, where, limit } = await import("firebase/firestore");
        const phone = qString.replace(/\D/g, '');
        const q = query(
            collection(db, "customers"), 
            where("mobile", ">=", phone),
            where("mobile", "<=", phone + '\uf8ff'),
            limit(5)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
        console.error("Search Failure:", err);
        return [];
    }
  }
};


