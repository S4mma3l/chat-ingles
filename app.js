// Configuración inicial de reconocimiento de voz y API de Gemini AI
const messageArea = document.getElementById('message-area');
const textInput = document.getElementById('text-input');
const sendButton = document.getElementById('send-btn');
const voiceButton = document.getElementById('voice-input-btn');
const replayButton = document.getElementById('replay-btn');
const speedSlider = document.getElementById('speed-slider');
const pauseResumeButton = document.getElementById('pause-resume-btn');

// Variable para rastrear el estado de carga
let isLoading = false;
// Variable para guardar el historial de conversación
let conversationHistory = [];
// Variable para guardar el último mensaje del bot
let lastBotMessage = "";
// Variable para guardar la voz que vamos a usar
let selectedVoice = null;
 // Variable para la velocidad de la voz
let speechRate = 0.9;
let currentUtterance = null;
let isPaused = false;

// Función para obtener la voz predeterminada en ingles
function getEnglishVoice() {
    const voices = speechSynthesis.getVoices();
    const englishVoices = voices.filter(voice => voice.lang === 'en-US' || voice.lang === 'en');
    return englishVoices[0] || null;
}

//Funcion para obtener las voces cuando esten listas
function loadVoices() {
    return new Promise(resolve => {
        speechSynthesis.onvoiceschanged = () => {
            resolve(speechSynthesis.getVoices());
        }
        if (speechSynthesis.getVoices().length) {
            resolve(speechSynthesis.getVoices());
        }
    });
}
// Cargar las voces al iniciar la aplicacion
loadVoices().then(() => {
    selectedVoice = getEnglishVoice();
    console.log("Voces cargadas", selectedVoice);
});


// Función para agregar mensajes al área de mensajes
function addMessage(content, isUser = true) {
    const message = document.createElement('div');
    message.classList.add('message', isUser ? 'user-message' : 'bot-message');

    // Agregar el avatar
    const avatar = document.createElement('div');
    avatar.classList.add('avatar');
    avatar.textContent = isUser ? 'U' : 'B';

    // Contenedor del contenido del mensaje
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('content');
    
    contentDiv.innerHTML = content;
    
    // Colocar el avatar a la izquierda si es mensaje del bot, a la derecha si es del usuario
    message.appendChild(isUser ? contentDiv : avatar);
    message.appendChild(isUser ? avatar : contentDiv);

    messageArea.appendChild(message); // Agrega el mensaje al area de mensajes
    messageArea.scrollTop = messageArea.scrollHeight; // Hace scroll hasta el final
    conversationHistory.push({ role: isUser ? 'user' : 'model', content }); // Agrega el mensaje al historial

   if (!isUser) {
         const textContent = contentDiv.textContent || contentDiv.innerText;
        speak(textContent); // Hablar si es mensaje del bot
        lastBotMessage = textContent; // Guardar el último mensaje del bot
    }
}


// Función para convertir texto a voz
function speak(text) {
       if(currentUtterance) {
            speechSynthesis.cancel();
         }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Configurar el idioma a inglés de Estados Unidos
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    utterance.pitch = 1; // Tono de la voz
    utterance.rate = speechRate; // Velocidad de la voz
    currentUtterance= utterance;
    speechSynthesis.speak(utterance); // Reproducir el texto
}


// Función para enviar el texto a Gemini AI y recibir la respuesta
async function sendToGeminiAI(userInput) {
  if (isLoading) return; // Evita solicitudes múltiples mientras se carga
    if(currentUtterance) {
        speechSynthesis.cancel();
    }
  isLoading = true;
  showLoadingIndicator(); // Mostrar indicador de carga

  try {
    const formattedHistory = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join("\n");
    const prompt = `
            Traduce la siguiente frase al inglés y proporciona ejemplos de uso en diferentes tiempos verbales: '[inserta tu frase en español aquí]
            Traducciones precisas: Ofrece traducciones al inglés con sus matices y contextos de uso, indicando la más adecuada para contextos formales e informales
            Organiza tu respuesta de la siguiente manera:

            1.  Primero, proporciona la traducción directa del texto al inglés.<br/>
            2.  Luego, explica el tiempo verbal utilizado en la oración original.<br/>
            3.  Por último, ofrece ejemplos en diferentes tiempos verbales:<br/>
            
            Simple Present: [ejemplo en presente]<br/>
            Present Continuous: [ejemplo en presente continuo]<br/>
            Simple Past: [ejemplo en pasado simple]<br/>
            Past Continuous: [ejemplo en pasado continuo]<br/>
            Present Perfect: [ejemplo en presente perfecto]<br/>
            Present Perfect Continuous: [ejemplo en presente perfecto continuo]<br/>
            Simple Future: [ejemplo en futuro simple]<br/>
            Future Continuous: [ejemplo en futuro continuo]<br/>
            Past Perfect: [ejemplo en pasado perfecto]<br/>
            Past Perfect Continuous: [ejemplo en pasado perfecto continuo]<br/>

            4.  No uses asteriscos (*) ni ningún otro caracter especial.
         
            Historial de Conversación:
            ${formattedHistory}
            user: ${userInput}
        `;
        const response = await fetch('https://chat-ingles-production-ccfd.up.railway.app/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: prompt })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        let responseText = data.response;
         responseText = responseText.replace(/\*/g, ''); // Elimina asteriscos
         responseText = responseText.replace(/  +/g, ' '); // Elimina dobles espacios

         const lines = responseText.trim().split('\n'); // Divide el texto en lineas
            const formattedText = lines.map(line => `<p>${line.trim()}</p>`).join(''); //  Crea parrafos
        return formattedText;
       
    } catch (error) {
        console.error('Error al comunicarse con Gemini AI:', error);
        return 'Lo siento, hubo un problema al procesar tu solicitud.';
    } finally {
        hideLoadingIndicator(); // Ocultar indicador de carga
        isLoading = false; // Reiniciar el estado de carga
    }
}

// Función para mostrar el indicador de carga
function showLoadingIndicator() {
    document.getElementById('loading-indicator').style.display = 'block';
}

// Función para ocultar el indicador de carga
function hideLoadingIndicator() {
    document.getElementById('loading-indicator').style.display = 'none';
}


// Evento para el botón de enviar texto
sendButton.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if(currentUtterance) {
            speechSynthesis.cancel();
         }
    if (text) {
        addMessage(text); // Agregar mensaje del usuario
        textInput.value = ''; // Limpiar el input
        const botResponse = await sendToGeminiAI(text); // Obtener la respuesta de Gemini
        addMessage(botResponse, false); // Agregar la respuesta del bot
    }
});

// Evento para la tecla "Enter" en el campo de texto
textInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
         if(currentUtterance) {
            speechSynthesis.cancel();
         }
        event.preventDefault(); // Prevenir el salto de linea por defecto
        const text = textInput.value.trim();
        if (text) {
            addMessage(text);
            textInput.value = '';
            const botResponse = await sendToGeminiAI(text);
            addMessage(botResponse, false);
        }
    }
});

// Evento para el botón de entrada de voz
voiceButton.addEventListener('click', () => {
    if(currentUtterance) {
        speechSynthesis.cancel();
    }
      // Verificar que el navegador soporta la API de reconocimiento de voz
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition && !navigator.mediaDevices) {
            alert('Tu navegador no soporta el reconocimiento de voz.');
           return;
        }
       // Solicitar permisos para acceder al micrófono en caso de no tener acceso
        if(navigator.mediaDevices){
             navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                initSpeechRecognition(); // Si el permiso esta concedido, iniciamos el reconocimiento de voz
             })
             .catch( () => {
               alert("No tienes permisos para usar el micrófono");
             })
           } else {
               initSpeechRecognition(); // si no esta mediaDevices, iniciamos el reconocimiento normalmente
            }
  
     function initSpeechRecognition(){
         const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.lang = 'es-ES';
             recognition.start();

             recognition.onresult = async (event) => {
            const voiceText = event.results[0][0].transcript;
            addMessage(voiceText); // Agregar mensaje de voz del usuario
             const botResponse = await sendToGeminiAI(voiceText); // Obtener respuesta de Gemini
             addMessage(botResponse, false); // Agregar respuesta del bot
        };

         recognition.onerror = () => {
            alert('No se pudo procesar el audio. Intenta de nuevo.'); // Notificar el error
         };
     }
});


// Evento para el botón de replay
replayButton.addEventListener('click', () => {
    if(currentUtterance) {
            speechSynthesis.cancel();
         }
    if (lastBotMessage) {
        speak(lastBotMessage);
    }
});
    // Evento para el slider
    speedSlider.addEventListener('input', () => {
       if (currentUtterance && !isPaused) {
             speechRate = parseFloat(speedSlider.value);
             currentUtterance.rate = speechRate;
           }
    });
        // Evento para el botón de pause/resume
    pauseResumeButton.addEventListener('click', () => {
        if(currentUtterance) {
              if (isPaused) {
                speechSynthesis.resume();
                 pauseResumeButton.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                  speechSynthesis.pause();
                 pauseResumeButton.innerHTML = '<i class="fas fa-play"></i>';
                }
               isPaused = !isPaused;
            }
    });