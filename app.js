// Configuración inicial de reconocimiento de voz y API de Gemini AI
const messageArea = document.getElementById('message-area');
const textInput = document.getElementById('text-input');
const sendButton = document.getElementById('send-btn');
const voiceButton = document.getElementById('voice-input-btn');
const replayButton = document.getElementById('replay-btn');
const speedSlider = document.getElementById('speed-slider');
const pauseResumeButton = document.getElementById('pause-resume-btn');
const waveContainer = document.getElementById('wave-container');
const loadingIndicator = document.getElementById('loading-indicator');

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
let isRecording = false;
let recognition;
let transcription = '';


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
     // Solicitar permisos para acceder al micrófono al iniciar la aplicacion
       if(navigator.mediaDevices){
             navigator.mediaDevices.getUserMedia({ audio: true })
            .catch( () => {
               alert("No tienes permisos para usar el micrófono");
             });
       }
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

  // Añadir vocabulario si es respuesta del bot
  if (!isUser) {
     const vocabularyWords = [];
     const formattedContent = content.replace(/\[(.*?)\]\((.*?)\)/g, (match, word, translation) => {
      vocabularyWords.push({word, translation});
        return `<span class="vocabulary-word">${word}</span>`
       });
   contentDiv.innerHTML = formattedContent;
      if (vocabularyWords.length > 0) {
          const vocabularyContainer = document.createElement('div');
           vocabularyContainer.classList.add('vocabulary-container');

          vocabularyWords.forEach(({ word, translation }) => {
          const bubble = document.createElement('span');
           bubble.classList.add('vocabulary-bubble');
           bubble.innerHTML = `${word}<span class="translation">(${translation})</span>`;
          vocabularyContainer.appendChild(bubble);
           });
        message.appendChild(vocabularyContainer); // Agrega el vocabulario al area de mensajes
      }
  }else{
       contentDiv.innerHTML = content;
    }

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
            4.  El texto de la respuesta debe estar bien estructurado y organizado de manera clara y concisa.<br/>
            5.  El texto siempre sera en ingles, no es necesario traducirlo.<br/>

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

            6.  No uses asteriscos (*) ni ningún otro caracter especial, y  encierra en corchetes las palabras de vocabulario que consideres relevantes, e incluye su traducción entre parentesis despues de cada palabra. Ejemplo: [example](ejemplo), [words](palabras).
         
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
        responseText = responseText.replace(/\*/g, '');
         responseText = responseText.replace(/  +/g, ' ');
        const lines = responseText.trim().split('\n');
        const formattedText = lines.map(line => `<p>${line.trim()}</p>`).join('');
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
      loadingIndicator.style.display = 'flex';
}

// Función para ocultar el indicador de carga
function hideLoadingIndicator() {
    loadingIndicator.style.display = 'none';
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
function initSpeechRecognition(){
         recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.lang = 'es-ES';
            recognition.interimResults = true;

             recognition.onresult = async (event) => {
                 let currentTranscript = "";
              for (let i = event.resultIndex; i < event.results.length; i++) {
                 currentTranscript += event.results[i][0].transcript;
                  if(event.results[i].isFinal){
                        transcription = currentTranscript
                            addMessage(currentTranscript);
                           const botResponse = await sendToGeminiAI(currentTranscript);
                            addMessage(botResponse, false);
                             transcription = '';
                       } else {
                         addMessage(currentTranscript, true) // Muestra el texto en tiempo real
                        }
                   }
            
        };

         recognition.onerror = () => {
            alert('No se pudo procesar el audio. Intenta de nuevo.'); // Notificar el error
         };
     }


// Evento para el botón de entrada de voz
voiceButton.addEventListener('mousedown', () => {
       if(currentUtterance) {
            speechSynthesis.cancel();
         }
    // Verificar que el navegador soporta la API de reconocimiento de voz
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition && !navigator.mediaDevices) {
        alert('Tu navegador no soporta el reconocimiento de voz.');
        return;
    }
        if(!recognition){
          initSpeechRecognition();
         }
         transcription = '' // Reset the transcription
    isRecording = true;
    voiceButton.classList.add('recording')
     waveContainer.classList.add('recording');
   recognition.start();
});

voiceButton.addEventListener('mouseup', () => {
  if(isRecording){
       recognition.stop();
         isRecording = false;
         voiceButton.classList.remove('recording')
          waveContainer.classList.remove('recording');
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