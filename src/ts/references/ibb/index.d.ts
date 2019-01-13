declare interface IbbPlugin{
    addIBBHandler(handler:(type:string, from:string, sid:string, data:string, seq:string)=>void);
}