// script_cadastro_cliente.js (frontend para a página de cadastro)

document.addEventListener('DOMContentLoaded', function() {
    const cadastroForm = document.getElementById('cadastroForm');
    const messageElement = document.getElementById('message');
    const nomeInput = document.getElementById('nome');
    const emailInput = document.getElementById('email');
    const telefoneInput = document.getElementById('telefone');
    const submitButton = cadastroForm.querySelector('button[type="submit"]');

    // Recupera os votos do sessionStorage
    const teamVote = sessionStorage.getItem('teamVote') || null; 
    const techVote = sessionStorage.getItem('techVote') || null; 

    function validateForm() {
        const nomeValido = nomeInput.value.trim() !== '';
        const emailValido = emailInput.value.trim() !== '' && emailInput.checkValidity(); 
        const telefoneValido = telefoneInput.value.trim() !== '';

        if (nomeValido && emailValido && telefoneValido) {
            submitButton.disabled = false;
            submitButton.style.opacity = '1'; 
            submitButton.style.cursor = 'pointer';
        } else {
            submitButton.disabled = true;
            submitButton.style.opacity = '0.6';
            submitButton.style.cursor = 'not-allowed';
        }
    }

    nomeInput.addEventListener('input', validateForm);
    emailInput.addEventListener('input', validateForm);
    telefoneInput.addEventListener('input', validateForm);

    validateForm(); 

    cadastroForm.addEventListener('submit', function(event) {
        event.preventDefault(); 

        const nome = nomeInput.value.trim();
        const email = emailInput.value.trim();
        const telefone = telefoneInput.value.trim();

        if (!nome || !email || !telefone) {
            messageElement.textContent = 'Por favor, preencha todos os campos.';
            messageElement.className = 'message error';
            return;
        }

        // **** ATENÇÃO: COLOQUE SEU URL ATUAL DO NGROK AQUI, COM A ROTA /register-client. ****
        // **** O URL ATUAL É: https://b5e0-45-234-208-249.ngrok-free.app ****
        // **** Garanta que o URL abaixo tenha a ROTA /register-client no final. ****
        const urlDoServidorCadastro = 'https://b5e0-45-234-208-249.ngrok-free.app/register-client'; 

        const opcoes = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                nome: nome, 
                email: email, 
                telefone: telefone,
                team_vote: teamVote, 
                tech_vote: techVote  
            })
        };

        fetch(urlDoServidorCadastro, opcoes) 
            .then(response => {
                if (response.status === 409) { 
                    return response.json().then(err => {
                        messageElement.textContent = err.message || 'Erro: Usuário já existente.';
                        messageElement.className = 'message error';
                        sessionStorage.removeItem('teamVote');
                        sessionStorage.removeItem('techVote');
                        setTimeout(() => {
                            window.location.href = 'index.html'; 
                        }, 3000); 
                        throw new Error(err.message); 
                    });
                }
                if (!response.ok) {
                    return response.text().then(text => { 
                        console.error('Erro de resposta do servidor (Texto):', text);
                        throw new Error(text || `Erro HTTP! Status: ${response.status}`); 
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Cliente cadastrado com sucesso:', data);
                messageElement.textContent = 'Cadastro realizado com sucesso!';
                messageElement.className = 'message success';
                sessionStorage.removeItem('teamVote');
                sessionStorage.removeItem('techVote');
                
                window.location.href = 'resultados_gerais.html'; 
            })
            .catch(error => {
                console.error('Erro ao cadastrar cliente:', error);
                let displayMessage = error.message;
                try {
                    const parsedError = JSON.parse(error.message);
                    if (parsedError && parsedError.message) {
                        displayMessage = parsedError.message;
                    }
                } catch (e) {
                    // Não é um JSON stringificado, usa a mensagem como está
                }

                if (!messageElement.textContent.includes('Usuário já existente') && !messageElement.textContent.includes('Por favor, preencha')) {
                    messageElement.textContent = displayMessage || 'Houve um erro ao cadastrar. Tente novamente.';
                    messageElement.className = 'message error';
                }
            });
    });
});
