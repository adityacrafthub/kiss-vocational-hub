// Exact domains only: neither subdomains nor lookalike suffixes are implicitly trusted.
export function approvedDomains(raw?:string){return (raw||'').split(',').map(v=>v.trim().toLowerCase().replace(/^@/,'')).filter(Boolean)}
export function institutionAllowed(email:string,role:string,config:{PARTICIPANT_EMAIL_DOMAINS?:string;CUSTOMER_EMAIL_DOMAINS?:string}){const domains=approvedDomains(role==='participant'?config.PARTICIPANT_EMAIL_DOMAINS:role==='customer'?config.CUSTOMER_EMAIL_DOMAINS:'');return !domains.length||domains.includes(email.split('@')[1]||'')}
