import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function useLearning() {
  const [lessons, setLessons] = useState(null);
  const [progress, setProgress] = useState([]);
  const [favourites, setFavourites] = useState([]);

  const load = useCallback(async () => {
    const [l, p, f] = await Promise.all([api.get("/lessons"), api.get("/progress"), api.get("/favourites")]);
    setLessons(l.data);
    setProgress(p.data);
    setFavourites(f.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const done = new Set(progress.map((p) => p.lesson_id));
  const toggleFavourite = async (id) => {
    if (favourites.includes(id)) {
      await api.delete(`/favourites/${id}`);
      setFavourites((f) => f.filter((x) => x !== id));
    } else {
      await api.post(`/favourites/${id}`);
      setFavourites((f) => [...f, id]);
    }
  };

  return { lessons, progress, done, favourites, toggleFavourite, reload: load };
}
