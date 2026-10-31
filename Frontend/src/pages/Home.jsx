
  useEffect(() => {
    const controller = new AbortController();

    async function loadNews() {
      try {
        const response = await fetch('/news/', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`News API HTTP ${response.status}`);
        }

        const payload = await response.json();
        const items = Array.isArray(payload.news) ? payload.news : [];

        if (!controller.signal.aborted) {
          setNews(items);
          setActiveNews(0);
          setNewsState(items.length ? 'ready' : 'empty');
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('News fetch failed:', error);
          setNewsState('error');
        }
      }
    }

    loadNews();
    return () => controller.abort();
  }, []);
