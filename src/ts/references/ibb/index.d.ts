declare interface IbbPlugin{
    addIBBHandler(handler:(type:string, from:string, sid:string, data:string, seq:string)=>void);
    open(to:string, sid:string, blockSize:number, cb:(err:Error)=>void);
    data(to:string, sid:string, seq:number, data:string, cb:(err:Error)=>void);
    close(to:string, sid:string, cb:(err:Error)=>void);
}