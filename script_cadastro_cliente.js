// script_cadastro_cliente.js (frontend para a página de cadastro)

document.addEventListener('DOMContentLoaded', function() {
    const cadastroForm = document.getElementById('cadastroForm');
    const messageElement = document.getElementById('message');
    const nomeInput = document.getElementById('nome');
    const emailInput = document.getElementById('email');
    const telefoneInput = document.getElementById('telefone');
    const submitButton = cadastroForm.querySelector('button[type="submit"]');

    // Recupera os votos do sessionStorage
    const teamVote = sessionStorage.getItem('teamVote') || null; // Pode ser null se o usuário pular a votação de time
    const techVote = sessionStorage.getItem('techVote') || null; // Pode ser null se o usuário pular a votação de tecnologia

    // --- Função para validar o formulário e ativar/desativar o botão ---
    function validateForm() {
        const nomeValido = nomeInput.value.trim() !== '';
        const emailValido = emailInput.value.trim() !== '' && emailInput.checkValidity(); // checkValidity para formato de email
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

    // Adiciona ouvintes para validar o formulário em tempo real
    nomeInput.addEventListener('input', validateForm);
    emailInput.addEventListener('input', validateForm);
    telefoneInput.addEventListener('input', validateForm);

    // Chama a validação inicial ao carregar a página
    validateForm(); 

    cadastroForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Impede o envio padrão do formulário

        const nome = nomeInput.value.trim();
        const email = emailInput.value.trim();
        const telefone = telefoneInput.value.trim();

        // Dupla validação no frontend antes de enviar
        if (!nome || !email || !telefone) {
            messageElement.textContent = 'Por favor, preencha todos os campos.';
            messageElement.className = 'message error';
            return;
        }

        // **** ATENÇÃO: ESTE É O URL BASE DO NGROK. ****
        // **** Use o URL EXATO que o ngrok te dá (ex: https://b5e0-45-234-208-249.ngrok-free.app) ****
        // **** NÃO COLOQUE ESPAÇOS OU CARACTERES EXTRAS NO FINAL! ****
        const urlDoServidorBase = 'https://b5e0-45-234-208-249.ngrok-free.app'; // <--- O SEU URL DO NGROK

        // **** LINHA CRÍTICA: Construção do URL COMPLETO com a rota /register-client ****
        const urlDoServidorCadastro = `${urlDoServidorBase}/register-client`;
        
        const opcoes = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // **** NOVO: Envia todos os dados, incluindo os votos recuperados ****
            body: JSON.stringify({ 
                nome: nome, 
                email: email, 
                telefone: telefone,
                team_vote: teamVote, // Enviando o voto de time
                tech_vote: techVote  // Enviando o voto de tecnologia
            })
        };

        // **** AGORA A REQUISIÇÃO SERÁ ENVIADA PARA O URL CORRETO: urlDoServidorCadastro ****
        fetch(urlDoServidorCadastro, opcoes) 
            .then(response => {
                // Tratamento para duplicidade de email ou telefone (status 409)
                if (response.status === 409) { 
                    return response.json().then(err => {
                        messageElement.textContent = err.message || 'Erro: Usuário já existente.';
                        messageElement.className = 'message error';
                        // Limpa os votos temporários (se houver) para uma nova tentativa
                        sessionStorage.removeItem('teamVote');
                        sessionStorage.removeItem('techVote');
                        // Redireciona para a página inicial após mensagem de erro
                        setTimeout(() => {
                            window.location.href = 'index.html'; 
                        }, 3000); // Redireciona após 3 segundos
                        throw new Error(err.message); // Interrompe o fluxo .then()
                    });
                }
                if (!response.ok) {
                    // Adicionamos `.text()` aqui para capturar a resposta HTML 404 se a rota não for encontrada.
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
                // Limpa os votos temporários do sessionStorage após o sucesso
                sessionStorage.removeItem('teamVote');
                sessionStorage.removeItem('techVote');
                
                // Redireciona para a página de resultados gerais após o cadastro
                window.location.href = 'resultados_gerais.html'; 
            })
            .catch(error => {
                console.error('Erro ao cadastrar cliente:', error);
                if (!messageElement.textContent.includes('Usuário já existente') && !messageElement.textContent.includes('Por favor, preencha')) {
                    messageElement.textContent = error.message || 'Houve um erro ao cadastrar. Tente novamente.';
                    messageElement.className = 'message error';
                }
            });
    });
});
