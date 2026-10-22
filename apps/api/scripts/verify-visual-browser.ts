// Reuse the real HOME journey's account isolation, process clocks and cleanup.
process.env.VISUAL_POLISH_REVIEW = '1';
await import('./verify-home-browser');
