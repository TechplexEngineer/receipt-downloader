

const orderReceiptUrl = "https://www.mcmaster.com/mv1655819346/WebParts/Activity/PDFRetriever/Receipts%20for%20PO%200226BBOURQUE.pdf?orderId=62195bdd6b8bf43f6c368068&docType=Invoice&action=1&loaded=1&retryCount=1";

// console.log(orderReceiptUrl.split("?")[0]);


var u = new URL(orderReceiptUrl)
u.hash = ''
u.search = ''

const parts = u.toString().split("/")
console.log(decodeURIComponent(parts[parts.length-1]).replace(/\s/g, "-"))