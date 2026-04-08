import { useState, useEffect, useCallback } from 'react';
import { db, collection, getDocs, query, where } from "../firebase";
export const useEvents = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        try {
            const eventsRef = collection(db, "events");
            const q = query(eventsRef, where("status", "==", "approved"));
            const snapshot = await getDocs(query(eventsRef));
            
            const fetched = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // DATA REPAIR: Convert string date "2025-12-21" to JS Date Object
                let eventDate;
                if (data.dateOrder?.toDate) {
                    eventDate = data.dateOrder.toDate(); // If it's a Firestore Timestamp
                } else if (data.date) {
                    eventDate = new Date(data.date); // If it's a string from your form
                } else {
                    eventDate = new Date(); // Fallback
                }
                

                return {
                    id: doc.id,
                    ...data,
                    // Standardize the field name used for sorting/filtering
                    dateOrder: eventDate, 
                    title: data.name || data.title // Ensures both 'name' and 'title' work
                };
            });
            
            // Sort by date ascending (soonest first)
            fetched.sort((a, b) => a.dateOrder - b.dateOrder);
            setEvents(fetched);
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    return { events, loading, fetchEvents };
};