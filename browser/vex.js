;var devnull = (async () => {

    if (typeof _ != 'function') {
        const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js');
        eval(await res.text())
    }

    if (typeof Date.fromString != 'function') {
        const res = await fetch('https://unpkg.com/any-date-parser@1.5.3/dist/browser-bundle.js');
        eval(await res.text())
    }

    
    const orderHistoryUrl = "https://www.vexrobotics.com/sales/order/history/";

    if (window.location.href != orderHistoryUrl) {
        alert(`Please naviage to ${orderHistoryUrl}`)
        return;
    }

    const table = document.querySelector(".orders-history table");
    let headers = Array.from(table.querySelectorAll("thead tr th")).map(th => th.innerText).map(_.camelCase)
    // console.log(headers)

    let orders = Array.from(table.querySelectorAll("tbody tr")).map((tr) => {
        return Array.from(tr.querySelectorAll("td")).reduce((prevVal, td, colIdx) => {
            let link = td.querySelector("a")
            if (link) {
                prevVal[`${headers[colIdx].toLowerCase()}Link`] = link.href;
            }
            prevVal[headers[colIdx]] = td.innerText;
            return prevVal;
        }, {});
    });
    console.log(orders)

    for (let order of orders) {
        // create a link with a target of download and click it
        // https://www.vexrobotics.com/sales/order/printInvoice/order_id/946055/
    }
})();