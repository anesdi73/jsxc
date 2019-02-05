
interface StrophePlugin{
        init(strophe: jsxc.Connection);
        statusChanged?(status: Strophe.Status, condition: string );
}
