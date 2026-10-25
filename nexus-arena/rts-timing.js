export const RTS_RECHECK_SECONDS=3;
// Twenty regular checks per minute, plus initial analysis and restart headroom.
export const RTS_REQUESTS_PER_MINUTE=Math.ceil(60/RTS_RECHECK_SECONDS)+4;
