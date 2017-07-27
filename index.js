var fps, btn, imageContainer, progress, canvas, tempImg, downloadBtn, ctx, svgText, svgXml, width, height, totalFrames, zip;

function reportProgress(percent) {
    if (isNaN(percent)) {
        progress.classList.add("indeterminate");
        progress.classList.remove("determinate");
        progress.style.width = "";
    } else {
        progress.classList.remove("indeterminate");
        progress.classList.add("determinate");
        progress.style.width = "" + percent + "%";
    }
}

function end() {
    btn.classList.remove("disabled");
    progress.parentElement.classList.add("hidden");
    downloadBtn.classList.remove("hidden");
    downloadBtn.classList.remove("disabled");
}

function findMax(element, attribute) {
    var max = 0;
    for (var i = 0; i < element.childNodes.length; ++i) {
        if (element.childNodes[i].hasAttribute(attribute)) {
            var val = parseFloat(element.childNodes[i].getAttribute(attribute));
            if (val > max) {
                max = val;
            }
        }
        var val = findMax(element.childNodes[i], attribute);
        if (val > max) {
            max = val;
        }
    }
    return max;
}

// https://stackoverflow.com/questions/41863426/javascript-least-common-multiple-algorithm
    function gcd(a,b){
        var t = 0;
        a < b && (t = b, b = a, a = t); // swap them if a < b
        t = a%b;
        return t ? gcd(b,t) : b;
    }

    function lcm(a,b){
        return a/gcd(a,b)*b;
    }
//

function animate(pos, from, to) {
    var froms = from.split(/[ \t]+/g);
    var tos = to.split(/[ \t]+/g);
    if (froms.length == tos.length) {
        var here = [];
        for (var i = 0; i < froms.length; ++i) {
            var fromu = froms[i].match(/[^-0-9]*$/)[0];
            var tou = tos[i].match(/[^-0-9]*$/)[0];
            if (fromu == tou) {
                var fromf = parseFloat(froms[i]);
                var tof = parseFloat(tos[i]);
                here[i] = "" + (fromf + (tof - fromf) * pos) + fromu;
            } else {
                console.error("Invalid animation bounds (from='" + from + "', to='" + to + "')");
                here[i] = from[i];
            }
        }
        return here.join(" ");
    } else {
        console.error("Invalid animation bounds (from='" + from + "', to='" + to + "')");
        return from;
    }
}

function renderFrame(frameNum) {
    if (frameNum == totalFrames) {
        reportProgress(NaN);
        zip.generateAsync({
            "type": "base64"
        }).then(function(content) {
            downloadBtn.setAttribute("download", document.getElementById("path").value.replace(/[^.]+$/, "") + "zip");
            downloadBtn.href = "data:application/zip;base64," + content;
            end();
        });
        end();
    } else {
        reportProgress(frameNum * 100 / totalFrames);
        svgXml = $.parseXML(svgText);
        var animations = svgXml.getElementsByTagName("animate");
        for (var i = 0; i < animations.length; ++i) {
            var dur = animations[i].getAttribute("dur");
            var repeat = animations[i].hasAttribute("repeatCount") ? animations[i].getAttribute("repeatCount") : "1";
            var frames = 1;
            if (dur.endsWith("s")) {
                frames = parseFloat(dur.substr(0, dur.length - 1)) * fps;
            }
            var pos = 0;
            if (repeat == "indefinite") {
                pos = (frameNum % frames) / frames;
            } else if (frameNum >= frames * parseInt(repeat)) {
                pos = 1;
            } else {
                pos = (frameNum % frames) / frames;
            }
            animations[i].parentElement.setAttribute(animations[i].getAttribute("attributeName"), animate(pos, animations[i].getAttribute("from"), animations[i].getAttribute("to")));
            animations[i].parentElement.removeChild(animations[i]);
        }
        tempImg.onload = function() {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(tempImg, 0, 0);
            var li = document.createElement("li");
            li.classList.add("collection-item");
            var img = document.createElement("img");
            var b64 = img.src = canvas.toDataURL();
            img.width = width;
            img.height = height;
            li.appendChild(img);
            imageContainer.appendChild(li);
            var filename = "" + frameNum + ".png";
            var filenameLen = ("" + (totalFrames - 1)).length + 4;
            while (filename.length < filenameLen) {
                filename = "0" + filename;
            }
            zip.file(filename, b64.split("base64,", 2)[1], {
                "base64": true
            });
            setTimeout(renderFrame.bind(null, frameNum + 1));
        };
        var svgStr = new XMLSerializer().serializeToString(svgXml);
        if (fps == 1) {
            console.debug(svgStr);
        }
        tempImg.src = "data:image/svg+xml;base64," + btoa(svgStr);
    }
}

function discoverBounds() {
    if (svgXml.documentElement.hasAttribute("width")) {
        width = parseFloat(svgXml.documentElement.getAttribute("width"));
    } else {
        width = findMax(document.documentElement, "width");
    }
    if (svgXml.documentElement.hasAttribute("height")) {
        height = parseFloat(svgXml.documentElement.getAttribute("height"));
    } else {
        height = findMax(document.documentElement, "height");
    }
    totalFrames = 1;
    var minFrames = 0;
    var animations = svgXml.getElementsByTagName("animate");
    for (var i = 0; i < animations.length; ++i) {
        var dur = animations[i].getAttribute("dur");
        var repeat = animations[i].hasAttribute("repeatCount") ? animations[i].getAttribute("repeatCount") : "1";
        var frames = 1;
        if (dur.endsWith("s")) {
            frames = parseFloat(dur.substr(0, dur.length - 1)) * fps;
        }
        if (repeat == "indefinite") {
            totalFrames = lcm(totalFrames, frames);
        } else {
            minFrames = frames * parseInt(repeat);
        }
    }
    if (totalFrames < minFrames) {
        totalFrames *= Math.ceil(minFrames / totalFrames);
    }
}

function printParams() {
    console.log("Render parameters:");
    console.log("  FPS    = " + fps + " f/s");
    console.log("  Width  = " + width + " px");
    console.log("  Height = " + height + " px");
    console.log("  Time   = " + totalFrames / fps + " s");
    console.log("  Frames = " + totalFrames + " f");
}

function start() {
    fps = parseInt(document.getElementById("fps").value);
    btn = document.getElementById("btn");
    imageContainer = document.getElementById("images");
    progress = document.getElementById("progress");
    canvas = document.getElementById("canvas");
    tempImg = document.getElementById("tempImg");
    downloadBtn = document.getElementById("download");
    var reader = new FileReader();
    reader.addEventListener("load", function() {
        svgText = reader.result;
        svgXml = $.parseXML(svgText);
        discoverBounds();
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext("2d");
        tempImg.width = width;
        tempImg.height = height;
        printParams();
        zip = new JSZip();
        setTimeout(renderFrame.bind(null, 0));
    });
    reader.readAsText(document.getElementById("file").files[0]);
    btn.classList.add("disabled");
    downloadBtn.classList.add("disabled");
    while (imageContainer.childNodes.length > 0) {
        imageContainer.removeChild(imageContainer.childNodes[0]);
    }
    imageContainer.classList.remove("hidden");
    progress.parentElement.classList.remove("hidden");
    canvas.classList.add("hidden");
    reportProgress(0);
}
