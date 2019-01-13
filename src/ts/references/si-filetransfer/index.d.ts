declare interface SiFileTransferPlugin{
    addFileHandler(fileHandler:(from:string, sid:string, filename:string, size:string, mime:string)=>void);
}