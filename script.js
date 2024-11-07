// Récupération des éléments HTML
const video = document.getElementById("camera");
const recognizedText = document.getElementById("recognizedText");
const translatedText = document.getElementById("translatedText");
const loading = document.getElementById("loading");

// Accéder à la caméra arrière
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(error => {
        console.error("Erreur lors de l'accès à la caméra :", error);
        alert("Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
    });

// Fonction pour afficher l'indicateur de chargement
function showLoading() {
    loading.style.display = "block";
}

// Fonction pour masquer l'indicateur de chargement
function hideLoading() {
    loading.style.display = "none";
}

// Fonction pour capturer l'image et effectuer l'OCR avec Tesseract.js et OpenCV.js
document.getElementById("captureButton").addEventListener("click", () => {
    showLoading();

    // Créer un canvas pour capturer l'image
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Vérifier si OpenCV est chargé
    if (cv && cv.Mat) {
        try {
            // Prétraitement de l'image avec OpenCV.js
            let src = cv.imread(canvas);
            let gray = new cv.Mat();
            let blurred = new cv.Mat();
            let binary = new cv.Mat();

            // Conversion en niveaux de gris
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

            // Application d'un flou gaussien
            cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

            // Seuillage adaptatif
            cv.adaptiveThreshold(blurred, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

            // Afficher l'image prétraitée sur le canvas
            cv.imshow(canvas, binary);

            // Libérer la mémoire
            src.delete();
            gray.delete();
            blurred.delete();
            binary.delete();
        } catch (error) {
            console.error("Erreur lors du prétraitement avec OpenCV.js :", error);
            // Continuer sans prétraitement si une erreur survient
        }
    }

    // Convertir le canvas en image base64
    const imageData = canvas.toDataURL('image/png').split(',')[1]; // Base64 sans le préfixe

    // Utiliser Tesseract.js pour effectuer l'OCR
    Tesseract.recognize(
        `data:image/png;base64,${imageData}`,
        'fra', // Spécifier la langue française pour l'OCR
        {
            logger: m => console.log(m) // Afficher les logs dans la console
        }
    ).then(({ data: { text } }) => {
        recognizedText.textContent = text;
        hideLoading();
    }).catch(error => {
        console.error("Erreur lors de l'OCR :", error);
        alert("Erreur lors de la reconnaissance de texte.");
        hideLoading();
    });
});

// Fonction pour lire le texte détecté
document.getElementById("speakButton").addEventListener("click", () => {
    const text = recognizedText.textContent;
    if (text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR'; // Modifier selon la langue du texte
        speechSynthesis.speak(utterance);
    } else {
        alert("Aucun texte détecté.");
    }
});

// Fonction pour lire le texte sélectionné
document.getElementById("speakSelectedButton").addEventListener("click", () => {
    const selectedText = getSelectedText();
    if (selectedText) {
        const utterance = new SpeechSynthesisUtterance(selectedText);
        // Déterminer la langue du texte sélectionné si nécessaire
        utterance.lang = 'fr-FR'; // Modifier selon la langue
        speechSynthesis.speak(utterance);
    } else {
        alert("Aucun texte sélectionné.");
    }
});

// Fonction pour traduire le texte sélectionné
document.getElementById("translateSelectedButton").addEventListener("click", async () => {
    const selectedText = getSelectedText();
    const targetLang = document.getElementById("translateLanguage").value;
    if (selectedText) {
        showLoading();
        const translated = await translateText(selectedText, targetLang);
        translatedText.value = translated;
        hideLoading();
    } else {
        alert("Aucun texte sélectionné.");
    }
});

// Fonction pour obtenir le texte sélectionné
function getSelectedText() {
    let text = "";
    if (window.getSelection) {
        text = window.getSelection().toString();
    } else if (document.selection && document.selection.type !== "Control") {
        text = document.selection.createRange().text;
    }
    return text.trim();
}

// Fonction pour traduire le texte avec LibreTranslate
async function translateText(text, targetLang) {
    try {
        const response = await fetch('https://libretranslate.de/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                q: text,
                source: "fr", // Langue source, ajustez si nécessaire
                target: targetLang,
                format: "text"
            })
        });
        const data = await response.json();
        return data.translatedText;
    } catch (error) {
        console.error("Erreur de traduction :", error);
        alert("Erreur lors de la traduction.");
        return "Erreur lors de la traduction.";
    }
}
