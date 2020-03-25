export default class WKScroller {
    _x: number;
    _y: number;
    _viewWidth: number;
    _viewHeight: number;
    _contentWidth: number;
    _contentHeight: number;
    _callback: any;
    constructor(callback: any);
    _postMessage(message: any): void;
    setDimensions(viewWidth: number | null, viewHeight: number | null, contentWidth: number | null, contentHeight: number | null): void;
    reportScroll(x: number, y: number, z: number | undefined): void;
    scrollTo(x: number, y: number, animated: boolean): void;
}
