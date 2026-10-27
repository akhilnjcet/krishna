import { db } from './firebase';
import api from './api';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    writeBatch, 
    doc, 
    deleteDoc 
} from 'firebase/firestore';

/**
 * Checks whether a chat room is closed/archived
 */
export const isRoomClosed = (room) => {
    if (!room) return false;
    if (room.status === 'archived' || room.status === 'closed') return true;
    if (typeof room.lastMessage === 'string' && room.lastMessage.toUpperCase().includes('CHANNEL CLOSED')) {
        return true;
    }
    return false;
};

/**
 * Permanently deletes a single chat room, all its messages, and linked request
 */
export const deleteChatRoom = async (roomId) => {
    if (!roomId) return;

    // 1. Delete all messages for this room in chunks of 400
    try {
        const msgsQ = query(collection(db, "messages"), where("chatId", "==", roomId));
        const msgsSnap = await getDocs(msgsQ);
        const docs = msgsSnap.docs;
        for (let i = 0; i < docs.length; i += 400) {
            const batch = writeBatch(db);
            docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    } catch (e) {
        console.warn("[supportChatService] Message cleanup warning for room", roomId, e.message);
    }

    // 2. Delete the room doc in Firestore
    try {
        await deleteDoc(doc(db, "chatRooms", roomId));
    } catch (e) {
        console.warn("[supportChatService] Room doc deletion warning:", roomId, e.message);
    }

    // 3. Delete matching chatRequests doc in Firestore
    try {
        const reqQ = query(collection(db, "chatRequests"), where("chatId", "==", roomId));
        const reqSnap = await getDocs(reqQ);
        if (!reqSnap.empty) {
            const batch = writeBatch(db);
            reqSnap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    } catch (e) {
        console.warn("[supportChatService] Linked request cleanup warning:", roomId, e.message);
    }

    // 4. Clean up backend records
    try {
        await api.delete(`/support/rooms/${roomId}`);
    } catch (e) {
        // Non-blocking
    }
};

/**
 * Permanently deletes all closed chat rooms and their messages
 */
export const deleteClosedRooms = async (rooms = []) => {
    const closed = rooms.filter(isRoomClosed);
    for (const room of closed) {
        await deleteChatRoom(room.id);
    }
    try {
        await api.delete('/support/requests/closed/all');
    } catch (e) {}
    return closed.length;
};

/**
 * Permanently deletes a support ticket and its associated chat room
 */
export const deleteSupportTicket = async (ticketId, roomId) => {
    if (ticketId) {
        try {
            await deleteDoc(doc(db, "chatRequests", ticketId));
        } catch (e) {
            console.warn("[supportChatService] Ticket deletion warning:", ticketId, e.message);
        }
        try {
            await api.delete(`/support/requests/${ticketId}`);
        } catch (e) {}
    }
    if (roomId) {
        await deleteChatRoom(roomId);
    }
};

/**
 * Permanently deletes all closed support tickets and their associated rooms
 */
export const clearAllClosedTickets = async (closedTickets = []) => {
    for (const t of closedTickets) {
        await deleteSupportTicket(t.id, t.chatId);
    }
    try {
        await api.delete('/support/requests/closed/all');
    } catch (e) {}
    return closedTickets.length;
};
