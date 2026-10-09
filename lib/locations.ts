export type Point={lat:number;lng:number};
export const DISPATCH_LOCATION:Point={lat:20.361631599452323,lng:85.8138230671771};
export const DISPATCH_ADDRESS='KP 25 J, Chandaka Industrial Estate, Patia, Bhubaneswar, Odisha 751024';
export function validPoint(p:any):p is Point{return !!p&&typeof p.lat==='number'&&typeof p.lng==='number'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=85&&Math.abs(p.lng)<=180}
