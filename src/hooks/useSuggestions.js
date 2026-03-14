// Real-time AI suggestion cards via Firestore onSnapshot
// Listens to 'suggestions' collection for current user, filtered by unread + not expired

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { getClientFirestore } from '../services/firebase';

export default function useSuggestions(userId) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const db = getClientFirestore();
    if (!db || !userId) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    // Real-time listener: unread suggestions that haven't expired
    const sugRef = collection(db, 'suggestions');
    const q = query(
      sugRef,
      where('userId', '==', userId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = new Date();
        const items = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => {
            // Client-side expiry filter (Firestore can't do > on two fields in compound query)
            const expires = s.expiresAt?.toDate?.() || new Date(s.expiresAt);
            return expires > now;
          });
        setSuggestions(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useSuggestions] onSnapshot error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Mark a suggestion as clicked
  const clickSuggestion = useCallback(
    async (suggestionId) => {
      const db = getClientFirestore();
      if (!db) return;

      try {
        await updateDoc(doc(db, 'suggestions', suggestionId), {
          read: true,
          actionTaken: 'clicked',
          actionAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('[useSuggestions] click error:', err);
      }
    },
    []
  );

  // Dismiss a suggestion
  const dismissSuggestion = useCallback(
    async (suggestionId) => {
      const db = getClientFirestore();
      if (!db) return;

      try {
        await updateDoc(doc(db, 'suggestions', suggestionId), {
          read: true,
          actionTaken: 'dismissed',
          actionAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('[useSuggestions] dismiss error:', err);
      }
    },
    []
  );

  return { suggestions, loading, error, clickSuggestion, dismissSuggestion };
}
