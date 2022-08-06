;var devnull = (async () => {
    if (typeof html2pdf != 'function') {
        const res = await fetch("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js");
        eval(await res.text());
    }
    if (typeof Sizzle != 'function') {
        const res = await fetch("https://cdnjs.cloudflare.com/ajax/libs/sizzle/2.3.6/sizzle.min.js");
        eval(await res.text());
    }

    const orderHistoryUrl = "https://www.amazon.com/gp/css/order-history";

    if (window.location.origin+window.location.pathname != orderHistoryUrl) {
        alert(`Please naviage to ${orderHistoryUrl}`)
        return;
    }
    
    let rawDate = Sizzle.matches('.a-column:has(>div> :contains("Order placed"))')[0].innerText.replace("ORDER PLACED\n","");
    let placed = new Date(Date.parse(rawDate));
    let dateStr = `${placed.getFullYear()}-${(placed.getMonth()+1).toString().padStart(2,'0')}-${placed.getDate().toString().padStart(2,'0')}`;
    console.log(dateStr)

    let total = Sizzle.matches('.a-column:has(>div> :contains("Total"))')[0].innerText.replace("TOTAL\n","");
    console.log(total)

    let orderNumber = Sizzle.matches('.a-row> div:has(> :contains("Order #"))')[0].innerText.replace("ORDER #","").trim()
    console.log(orderNumber)


    
    let invoiceLink = Sizzle.matches('a:contains("View invoice")')[0].href;
    console.log(invoiceLink)

    // let iframe = await injectIframe(invoiceLink)

    let data = await fetch(invoiceLink, {credentials: "include"});
    let htmlContent = await data.text();
    // console.log(htmlContent)
    
    let filename = `${dateStr} Amazon ${orderNumber} - ${total}.html`;
    download(filename, htmlContent)
    // html2pdf().set({
    //     filename: pdfName,
    //     margin: [10,10,10,10],
    //     html2canvas:  { width:  800 },
    //     // jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    // }).from(htmlContent).save()
})();

// async function injectIframe(url) {
//     return new Promise((resolve, reject)=>{
//         var iframe = document.createElement('iframe');
//         iframe.onload = ()=>{
//             resolve(iframe)
//         }
//         // iframe.style.display = "none";
//         iframe.src = url;
//         document.body.appendChild(iframe);
//     })
// }

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
