declare interface SiFileTransferPlugin{
    addFileHandler(fileHandler:(from:string, sid:string, filename:string, size:string, mime:string)=>void);
    send(to:string,sid:string, filename:string, size:number, mime:string, cb:(err:Error)=>void):void;
    
}