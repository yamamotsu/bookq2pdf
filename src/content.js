const elem = document.createElement("a")
elem.addEventListener("click", getAllSlide)
elem.textContent = "Download PDF"

function getCurrentPageNum() {
    const pageNumberText = document.getElementById("pageNumberText").textContent
    // console.log(pageNumberText)
    const pageNumberSplit = pageNumberText.split("/")
    const pageCount = parseInt(pageNumberSplit[1].slice(1))
    const currentPage = parseInt(pageNumberSplit[0].split(":")[1].slice(1, -1))
    return [currentPage, pageCount]
}

function waitPageChangeAsync(to, timeout=5000) {
    return new Promise((resolve) => {
        const id = setInterval(() => {
            if(getCurrentPageNum()[0] == to){
                resolve()
                // console.log("proceed end")
                clearInterval(id)
            }
        }, 500)
        setTimeout(()=>{
            clearInterval(id)
            // console.log("clear")
        }, timeout)
    })
}

// from https://qiita.com/economist/items/768d2f6a10d54d4fa39f
async function sha256(text){
    const uint8  = new TextEncoder().encode(text)
    const digest = await crypto.subtle.digest('SHA-256', uint8)
    return Array.from(new Uint8Array(digest)).map(v => v.toString(16).padStart(2,'0')).join('')
}

async function getCanvasDataWithHash(canvas){
    const image = canvas.toDataURL("image/png")
    const hash = await sha256(image)
    return {
        image: image,
        hash: hash
    }
}

async function waitCanvasChangeAsync(canvas, oldHash, timeout=5000){
    // const old = await getCanvasDataWithHash(canvas)[1]
    // console.log(old)
    return new Promise((resolve, reject) => {
        let id = setInterval(async () => {
            const datahash = await getCanvasDataWithHash(canvas)
            if(datahash.hash !== oldHash){
                resolve(datahash)
                console.log("image changed")
                clearInterval(id)
                id = null
            }
        }, 250)
        setTimeout(()=>{
            if(id){
                clearInterval(id)
                reject(null)
            }
            // console.log("clear")
        }, timeout)
    })
}

async function goPage(target) {
    const pageNum = getCurrentPageNum()
    const current = pageNum[0]
    const totalPages = pageNum[1]

    if(target >= totalPages){
        console.error("`target` page num must be less than totalpages")
        return
    }

    let btn = null
    let loops = 0
    if(current == target){
        return
    }
    else if(current > target) {
        loops = current - target
        btn = document.getElementById("prev").children[0] // クリック判定があるdiv
    }
    else{
        btn = document.getElementById("next").children[0] // クリック判定があるdiv
        loops = target - current
    }

    console.log(btn, loops)
    let i = 0
    const id = setInterval(()=>{
        if(i >= loops) {
            clearInterval(id)
            return
        }
        btn.click()
        i += 1
    }, 400)

    await waitPageChangeAsync(target, 20000)
}

async function getAllSlide(){
    const canvas = document.getElementById("TeachingMaterial")
    const next = document.getElementById("next") // クリック判定があるdiv
    const prev = document.getElementById("prev")
    const slider = document.getElementById("sliderarea")

    elem.textContent = "SCANNING.."
    next.style.display = "none"
    prev.style.display = "none"
    slider.style.display = "none"

    const allImageData = []

    let pageNum = getCurrentPageNum()
    const pageCount = pageNum[1]

    await goPage(1)

    console.log('width', canvas.width, 'height', canvas.height)

    let oldHash = ""
    for(let i = 0; i < pageCount; i++){
        // await waitPageChangeAsync(i+1)
        const dataHash = await waitCanvasChangeAsync(canvas, oldHash, 20000)
        if(!dataHash) {
            console.error("Canvas loading timeout.")
            return
        }
        // const url = dataHash.image
        oldHash = dataHash.hash

        allImageData.push({
            image: dataHash.image,
            width: canvas.width,
            height: canvas.height,
        })
        // console.log("got page image")

        next.children[0].click()
    }
    console.log("OK")

    const doc = {
        pageSize: {
            width: canvas.width,
            height: canvas.height
        },
        // pageOrientation: 'landscape',
        pageMargins: [0, 0, 0, 0],
        content: allImageData
    }

    // const pdfMake =  require('pdfmake/build/pdfmake.js')
    elem.textContent = "Download PDF"
    next.style.display = "block"
    prev.style.display = "block"
    slider.style.display = "block"

    const now = new Date(Date.now())
    const filename = "bookq_"+now.toLocaleDateString()+".pdf"
    pdfMake.createPdf(doc).download(filename)
}

window.onload = () => {
    const links = document.getElementsByClassName("container-fluid")
    if (links.length > 0){
        const header = links[0]
        header.appendChild(elem)
    }else{
        console.warn("header class was not found. ")
    }
}