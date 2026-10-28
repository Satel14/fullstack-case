import { useEffect, useState } from 'react';

export default function useMediaQuery(query) {
    const [match, setMatch] = useState(() => window.matchMedia(query).matches);

    useEffect(() => {
        const list = window.matchMedia(query);
        const update = () => setMatch(list.matches);
        update();
        if (list.addEventListener) {
            list.addEventListener('change', update);
            return () => list.removeEventListener('change', update);
        }
        list.addListener(update);
        return () => list.removeListener(update);
    }, [query]);

    return match;
}
