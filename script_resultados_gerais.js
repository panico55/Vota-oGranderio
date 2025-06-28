// script_resultados_gerais.js (frontend para a página de resultados finais)

document.addEventListener('DOMContentLoaded', function() {
    const listaVotosTimesElemento = document.getElementById('lista-votos-times');
    const listaVotosTechElemento = document.getElementById('lista-votos-tech');
    const timerElement = document.getElementById('timer'); 

    // **** ATENÇÃO: COLOQUE SEU URL ATUAL DO NGROK AQUI, COM AS ROTAS CORRETAS. ****
    // **** O URL ATUAL É: https://b5e0-45-234-208-249.ngrok-free.app ****
    // **** Garanta que o URL abaixo tenha a ROTA no final. ****
    const urlResultadosTimes = 'https://b5e0-45-234-208-249.ngrok-free.app/votos-times-results';
    const urlResultadosTech = 'https://b5e0-45-234-208-249.ngrok-free.app/votos-tech-results';

    let inactivityTimeout; // Variável para armazenar o timeout de inatividade
    const INACTIVITY_DELAY_SECONDS_TO_STAY_ACTIVE = 15; // Tempo de inatividade para "manter a página ativa"

    // --- Função para buscar e exibir os resultados de Times ---
    function fetchTeamResults() {
        fetch(urlResultadosTimes) 
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => { 
                        console.error('Erro de resposta do servidor (Texto):', text);
                        throw new Error(text || `Erro HTTP! Status: ${response.status}`); 
                    });
                }
                return response.json(); 
            })
            .then(data => {
                listaVotosTimesElemento.innerHTML = ''; 
                if (data.teamVotes && data.teamVotes.length > 0) {
                    data.teamVotes.forEach((voto, index) => { 
                        const listItem = document.createElement('li');
                        const displayName = voto.team_vote.charAt(0).toUpperCase() + voto.team_vote.slice(1);
                        
                        listItem.innerHTML = `
                            <div class="team-result-item">
                                <img src="imagens/${voto.team_vote}.png" 
                                     alt="${displayName} Escudo" 
                                     class="team-result-img" 
                                     data-rank="${index + 1}"
                                     onerror="this.onerror=null; this.src='https://placehold.co/90x90/FF0000/FFFFFF?text=ERRO'; console.error('Falha ao carregar escudo: imagens/${voto.team_vote}.png');"> 
                            </div>
                            <span>${voto.total_votos}</span>
                        `;
                        listaVotosTimesElemento.appendChild(listItem);
                    });
                } else {
                    listaVotosTimesElemento.innerHTML = '<li>Nenhum voto de time registrado ainda.</li>';
                }
            })
            .catch(error => {
                console.error('Erro ao buscar resultados de times:', error);
                listaVotosTimesElemento.innerHTML = '<li>Erro ao carregar resultados de times.</li>';
            });
    }

    // --- Função para buscar e exibir os resultados de Tecnologia ---
    function fetchTechResults() {
        fetch(urlResultadosTech) 
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => { 
                        console.error('Erro de resposta do servidor (Texto):', text);
                        throw new Error(text || `Erro HTTP! Status: ${response.status}`); 
                    });
                }
                return response.json(); 
            })
            .then(data => {
                listaVotosTechElemento.innerHTML = ''; 
                if (data.techVotes && data.techVotes.length > 0) {
                    data.techVotes.forEach(voto => {
                        const listItem = document.createElement('li');
                        const displayName = voto.tech_vote.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                        listItem.innerHTML = `<span>${displayName}</span><span>${voto.total_votos}</span>`; 
                        listaVotosTechElemento.appendChild(listItem);
                    });
                } else {
                    listaVotosTechElemento.innerHTML = '<li>Nenhum voto de tecnologia registrado ainda.</li>';
                }
            })
            .catch(error => {
                console.error('Erro ao buscar resultados de tecnologia:', error);
                listaVotosTechElemento.innerHTML = '<li>Erro ao carregar resultados de tecnologia.</li>';
            });
    }

    fetchTeamResults();
    fetchTechResults();

    function redirectToIndexOnActivity() {
        clearTimeout(inactivityTimeout); 
        console.log('Interação detectada na página de resultados. Redirecionando para a página inicial.');
        window.location.href = 'index.html'; 
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimeout); 
        inactivityTimeout = setTimeout(() => {
            console.log('Página de resultados em inatividade por ' + INACTIVITY_DELAY_SECONDS_TO_STAY_ACTIVE + ' segundos. Permanecendo na página.');
            resetInactivityTimer(); 
        }, INACTIVITY_DELAY_SECONDS_TO_STAY_ACTIVE * 1000);
    }

    resetInactivityTimer();

    document.addEventListener('mousemove', redirectToIndexOnActivity);
    document.addEventListener('keypress', redirectToIndexOnActivity);
    document.addEventListener('click', redirectToIndexOnActivity);
    document.addEventListener('touchstart', redirectToIndexOnActivity); 
    document.addEventListener('scroll', redirectToIndexOnActivity); 
});
