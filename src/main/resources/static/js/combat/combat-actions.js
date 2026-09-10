import { pageState, combatWarningTimer, combatCountdownInterval, setButtonsProcessing } from './combat-state.js';
import { updateUI } from './combat-ui.js';
import * as ui from '../ui.js?v=4';
import { getSpellEffectsSummaryHtml } from '../grimoire.js';
import { getVoieButtonColor, getSpiritButtonColor } from '../filters.js';


export async function endTurn() {
    if (!pageState.sessionId || !pageState.currentSessionData || pageState.isProcessing) return;
    pageState.isProcessing = true;
    setButtonsProcessing(true);

    try {
        let url = `/api/pve/combat/${pageState.sessionId}/end-turn`;
        const res = await globalFetch(url, { method: 'POST' });
        const data = await res.json();

        setTimeout(() => {
            pageState.isProcessing = false;
            setButtonsProcessing(false);
            updateUI(data);
        }, 600);

    } catch (e) {
        console.error(e);
        pageState.isProcessing = false;
        setButtonsProcessing(false);
        // Retry from server state to recover
        try {
            const retryRes = await globalFetch(`/api/pve/combat/${pageState.sessionId}/resume`, { method: 'POST' });
            const retryData = await retryRes.json();
            updateUI(retryData);
        } catch (e2) {
            console.error('Recovery failed:', e2);
            window.showNotif("Erreur critique. Rechargez la page.", true);
        }
    }
}

export async function nextRoom() {
    if (!pageState.sessionId || pageState.isProcessing) return;
    pageState.isProcessing = true;
    setButtonsProcessing(true);

    document.getElementById('eventOverlay').classList.remove('show');
    const vicOverlay = document.getElementById('combatVictoryOverlay');
    if (vicOverlay) vicOverlay.classList.remove('show');

    try {
        const res = await globalFetch(`/api/pve/combat/${pageState.sessionId}/next-room`, { method: 'POST' });
        const data = await res.json();

        // Track the current XP so animations in new rooms start from this baseline
        data.players.forEach(p => {
            pageState.previousPlayerXP[p.id] = p.experience;
            pageState.previousPlayerSpiritXP[p.id] = p.spiritualiteExperience || 0;
        });

        updateUI(data);
    } catch (e) {
        console.error(e);
        window.showNotif("Erreur lors du passage à la salle suivante", true);
        // Retry from server state
        try {
            const retryRes = await globalFetch(`/api/pve/combat/${pageState.sessionId}/resume`, { method: 'POST' });
            const retryData = await retryRes.json();
            updateUI(retryData);
        } catch (e2) {
            console.error('Recovery failed:', e2);
        }
    } finally {
        pageState.isProcessing = false;
        setButtonsProcessing(false);
    }
}

export async function openStrangeDoor() {
    if (!pageState.sessionId || pageState.isProcessing) return;
    pageState.isProcessing = true;
    setButtonsProcessing(true);

    document.getElementById('eventOverlay').classList.remove('show');
    const vicOverlay = document.getElementById('combatVictoryOverlay');
    if (vicOverlay) vicOverlay.classList.remove('show');

    try {
        const res = await globalFetch(`/api/pve/combat/${pageState.sessionId}/open-strange-door`, { method: 'POST' });
        if (!res.ok) {
            const errText = await res.text();
            window.showNotif(errText || "Erreur lors de l'ouverture de la porte", true);
            pageState.isProcessing = false;
            setButtonsProcessing(false);
            return;
        }
        const data = await res.json();

        // Track the current XP so animations in new rooms start from this baseline
        data.players.forEach(p => {
            pageState.previousPlayerXP[p.id] = p.experience;
            pageState.previousPlayerSpiritXP[p.id] = p.spiritualiteExperience || 0;
        });

        updateUI(data);
    } catch (e) {
        console.error(e);
        window.showNotif("Erreur lors de l'ouverture de la porte", true);
    } finally {
        pageState.isProcessing = false;
        setButtonsProcessing(false);
    }
}

export async function acceptAlteration() {
    if (!pageState.sessionId || pageState.isProcessing) return;
    pageState.isProcessing = true;
    setButtonsProcessing(true);
    try {
        let myPlayer = pageState.currentSessionData.players.find(p => p.ownerUsername === pageState.currentUsername);
        if (!myPlayer && pageState.currentSessionData.players.length > 0) {
            myPlayer = pageState.currentSessionData.players[0];
        }
        const charId = myPlayer ? myPlayer.id : '';
        let url = `/api/pve/combat/${pageState.sessionId}/alteration-accept?characterId=${charId}`;
        const select = document.getElementById('altarAnomalySelect');
        if (select) {
            url += `&anomalyId=${select.value}`;
        }
        const res = await globalFetch(url, {
            method: 'POST'
        });
        if (!res.ok) {
            const err = await res.text();

            // Animation de vibration sur les textes d'erreur si présents
            const missingItem = document.getElementById('itemAlterationMissingText');
            if (missingItem) {
                missingItem.classList.remove('shake-animation');
                void missingItem.offsetWidth; // force reflow
                missingItem.classList.add('shake-animation');
            }

            const missingAltar = document.getElementById('altarAlterationMissingText');
            if (missingAltar) {
                missingAltar.classList.remove('shake-animation');
                void missingAltar.offsetWidth; // force reflow
                missingAltar.classList.add('shake-animation');
            }

            window.showNotif(err || "Action impossible", true);
            pageState.isProcessing = false;
            setButtonsProcessing(false);
            return;
        }
        const data = await res.json();
        updateUI(data);
    } catch (e) {
        console.error(e);
        window.showNotif("Erreur lors de l'altération", true);
    } finally {
        pageState.isProcessing = false;
        setButtonsProcessing(false);
    }
}

export async function useRope(equipmentId) {
    if (!pageState.sessionId || pageState.isProcessing) return;
    pageState.isProcessing = true;
    setButtonsProcessing(true);
    try {
        let url = `/api/pve/combat/${pageState.sessionId}/use-rope`;
        if (equipmentId) url += `?equipmentId=${equipmentId}`;
        const res = await globalFetch(url, {
            method: 'POST'
        });
        if (!res.ok) {
            const err = await res.text();
            window.showNotif(err || "Action impossible", true);
            pageState.isProcessing = false;
            return;
        }
        const data = await res.json();
        updateUI(data);
    } catch (e) {
        console.error(e);
        window.showNotif("Erreur lors de l'utilisation de la corde", true);
    } finally {
        pageState.isProcessing = false;
        setButtonsProcessing(false);
    }
}

export async function buyMerchantItem(lootIndex) {
    if (!pageState.sessionId || !pageState.currentSessionData || !pageState.currentSessionData.players || pageState.currentSessionData.players.length === 0 || pageState.isProcessing) return;
    pageState.isProcessing = true;
    setButtonsProcessing(true);
    const myPlayer = pageState.currentSessionData.players.find(p => p.ownerUsername === pageState.currentUsername) || pageState.currentSessionData.players[0];
    const charId = myPlayer.id;

    try {
        const btn = document.getElementById(`btn_buy_${lootIndex}`);
        if (btn) btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span>';

        const res = await globalFetch(`/api/pve/combat/${pageState.sessionId}/merchant-buy?lootIndex=${lootIndex}&characterId=${charId}`, { method: 'POST' });
        if (!res.ok) {
            const errorText = await res.text();
            window.showNotif(errorText || "Vous n'avez pas les ressources nécessaires.", true);
            if (btn) btn.innerHTML = '<span class="material-symbols-outlined icon-md">shopping_cart</span>Acheter';
            return;
        }
        const data = await res.json();
        updateUI(data);
    } catch (e) {
        console.error(e);
        window.showNotif("Erreur lors de l'achat.", true);
    } finally {
        pageState.isProcessing = false;
        setButtonsProcessing(false);
    }
}

export function openBuyModal(idx, itemName, goldPrice = 0, specialItemName = null) {
    let costText = '';
    if (goldPrice > 0) {
        costText += `<strong style="color:#fbbf24;">${goldPrice}</strong> Or`;
    }
    if (specialItemName) {
        let priceColor = '#d946ef';
        let priceIcon = 'star';
        if (Array.isArray(window.allAnomaliesCombat)) {
            const anPrice = window.allAnomaliesCombat.find(a => a.name === specialItemName);
            if (anPrice) {
                priceColor = getSpiritualiteColor(anPrice.spiritualite);
                priceIcon = anPrice.category ? getCategoryIcon(anPrice.category) : 'star';
            }
        }
        if (costText !== '') costText += ' et ';
        costText += `<span style="display:inline-flex; align-items:center; color:${priceColor}; gap:0.2rem;"><span class="material-symbols-outlined" style="font-size:1.1rem; vertical-align:middle;">${priceIcon}</span> 1x ${specialItemName}</span>`;
    }
    if (costText === '') costText = 'rien du tout';

    ui.showModal({
        title: 'Acheter cet objet ?',
        body: `Voulez-vous vraiment acheter <strong class="text-white">${itemName}</strong> ?<br>Cela coûtera ${costText}.`,
        icon: 'shopping_cart',
        confirmText: 'Oui, acheter',
        onConfirm: async () => {
            await buyMerchantItem(idx);
        }
    });
}

export function closeBuyModal() {
    const modal = document.getElementById('buyConfirmModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

export async function addLootedConsumable(itemName, iconElement) {
    if (!pageState.sessionId) return;
    try {
        iconElement.classList.add('disabled');
        const res = await globalFetch(`/api/pve/combat/${pageState.sessionId}/add-consumable-by-name?itemName=${encodeURIComponent(itemName)}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.text();
            window.showNotif(err || "Erreur serveur", true);
            iconElement.classList.remove('disabled');
            return;
        }
        const updatedSession = await res.json();

        // Success
        iconElement.style.color = '#10b981';
        iconElement.style.opacity = '1';
        iconElement.style.cursor = 'default';
        iconElement.onmouseover = null;
        iconElement.onmouseout = null;
        iconElement.onclick = null;
        iconElement.title = "Dans l'inventaire du groupe";

        pageState.currentSessionData = updatedSession;
        resetCombatTimeoutWarning(false);
        if (typeof window.renderOverlayInventory === 'function') {
            window.renderOverlayInventory('eventOverlayInventoryList');
            window.renderOverlayInventory('combatVictoryInventoryList');
        }
        window.showNotif(`${itemName} a été ajouté à votre inventaire actif.`);
    } catch (e) {
        console.error(e);
        window.showNotif(e.message || "Erreur lors de l'ajout", true);
        iconElement.style.pointerEvents = 'auto';
        iconElement.style.opacity = '1';
    }
}

export async function openChest(equipmentId) {
    if (!pageState.sessionId || pageState.isProcessing) return;
    pageState.isProcessing = true;
    setButtonsProcessing(true);
    try {
        const btn = document.getElementById('btnOpenChest');
        const btnKey = document.getElementById('btnOpenChestKey');
        if (btn) btn.disabled = true;
        if (btnKey) btnKey.disabled = true;

        if (equipmentId && btnKey) {
            btnKey.innerHTML = `<span class="material-symbols-outlined spin">sync</span> Ouverture...`;
        } else if (!equipmentId && btn) {
            btn.innerHTML = `<span class="material-symbols-outlined spin">sync</span> Ouverture...`;
        }

        let url = `/api/pve/combat/${pageState.sessionId}/open-chest`;
        if (equipmentId) url += `?equipmentId=${equipmentId}`;
        const res = await globalFetch(url, { method: 'POST' });
        if (!res.ok) {
            const err = await res.text();
            if (typeof showNotif !== 'undefined') window.showNotif("Erreur : " + err, true);
            else ui.showNotif("Erreur : " + err, true);
            pageState.isProcessing = false;
            return;
        }

        const data = await res.json();

        // Handle button UI reset if it was in loading state
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span class="material-symbols-outlined">lock_open</span> Ouvrir le coffre`;
        }
        if (btnKey) {
            btnKey.disabled = false;
            btnKey.innerHTML = `<span class="material-symbols-outlined">vpn_key</span> Ouvrir (Clé : +10% de butin)`;
        }

        // Then call updateUI
        updateUI(data);

    } catch (e) {
        console.error(e);
        if (typeof showNotif !== 'undefined') window.showNotif("Erreur lors de l'ouverture du coffre.", true);
        else ui.showNotif("Erreur lors de l'ouverture du coffre.", true);
    } finally {
        pageState.isProcessing = false;
        setButtonsProcessing(false);
    }
}

export function resetCombatTimeoutWarning(finished) {
    if (combatWarningTimer) {
        clearTimeout(combatWarningTimer);
        combatWarningTimer = null;
    }
    if (combatCountdownInterval) {
        clearInterval(combatCountdownInterval);
        combatCountdownInterval = null;
    }
    if (finished) return;

    combatWarningTimer = setTimeout(() => {
        if (typeof ui !== 'undefined' && ui.showModal) {
            let seconds = 60;

            ui.showModal({
                title: 'Alerte Inactivité',
                body: `Le combat expirera dans <strong id="combat-timeout-countdown" class="text-error" style="font-size:1.5rem;">${seconds}</strong> secondes.<br><br>Cliquez sur valider pour continuer à jouer.`,
                icon: 'timer',
                confirmText: 'Je suis là',
                hideCancel: true,
                onConfirm: async () => {
                    clearInterval(combatCountdownInterval);
                    try {
                        await window.globalFetch('/api/pve/combat/' + pageState.sessionId, { method: 'GET' });
                        resetCombatTimeoutWarning(false);
                    } catch (e) {
                        console.error(e);
                    }
                }
            });

            combatCountdownInterval = setInterval(() => {
                seconds--;
                const counterEl = document.getElementById('combat-timeout-countdown');
                if (counterEl) {
                    counterEl.innerText = seconds;
                }
                if (seconds <= 0) {
                    clearInterval(combatCountdownInterval);
                    window.location.reload();
                }
            }, 1000);

        } else {
            alert("⚠️ Attention : Le combat expirera dans 1 minute pour inactivité !");
        }
    }, 540000); // 9 minutes
}

export const GAME_TIPS = [
    "Les dégâts de <span class=\"text-red-400 font-semibold\">[Brûlure]</span> sont de type <span class=\"text-blue-400 font-semibold\">Magique</span>. Contrairement aux autres attaques <span class=\"text-blue-400 font-semibold\">Magique</span>, la <span class=\"text-purple-400 font-semibold\">Résistance</span> de la cible réduit deux fois plus les dégats de brûlure !",
    "Le <span class=\"text-emerald-400 font-semibold\">[Poison]</span> inflige des dégâts <span class=\"text-slate-300 font-semibold\">Bruts</span>, mais c'est la seule altération totalement purifiée par le moindre <span class=\"text-emerald-300 font-semibold\">soin</span> (un soin direct, un vol de vie ou un HoT dissipe tous les poisons). Note : La régénération native ne compte pas comme un soin.",
    "L'<span class=\"text-amber-400 font-semibold\">Armure</span> et la <span class=\"text-purple-400 font-semibold\">Résistance</span> réduisent les dégâts que vous subissez. Mais attention : plus vous en accumulez, moins chaque nouveau point est efficace. Il est impossible d'atteindre 100% de réduction et de devenir invincible !",
    "Les <span class=\"text-yellow-400 font-semibold\">Secrets</span> peuvent être découverts via des recettes alchimiques. Ils donnent accès à de nouveaux donjons, plus dangereux et contenant de meilleurs équipements !",
    "Une attaque de base inflige 80% de votre <span class=\"text-amber-400 font-semibold\">Force</span> ou de votre <span class=\"text-blue-400 font-semibold\">Puissance</span> (la plus haute). Si vous avez autant de <span class=\"text-amber-400 font-semibold\">Force</span> que de <span class=\"text-blue-400 font-semibold\">Puissance</span>, l'attaque devient mixte (50% Physique, 50% Magique [donc 20% de dégats en plus]).",
    "Un sort <span class=\"text-emerald-400 font-semibold\">'Instantané'</span> ne consomme pas votre action du tour. Mais attention, si vous faites une autre action avant de lancer votre sort instantané, vous perdrez la capaciter d'en lancer un !",
    "Vous pouvez lancer des sorts instantanés pendant que vous êtes en train de caster la plupart des sorts canalisés ! Attention, certain rare sorts canalisés sont trop puissant et ne le permettent pas.",
    "Un sort <span class=\"text-purple-400 font-semibold\">'Canalisé'</span> s'exécute au moment de le lancer au T1, puis à la fin de chaque tour durant le reste de la canalisation.",
    "Certains sorts possèdent des variantes (Options). Elles permettent de choisir quel effet on exécute parmi plusieurs propositions.",
    "Les <span class=\"text-yellow-400 font-semibold\">Coups Critiques</span> multiplient par 1.5 l'efficacité de presque tout : les dégâts (bruts, magiques, physiques, brûlure, poison), mais aussi les soins, les boucliers et la restauration de mana !",
    "Les dégâts sur la durée <span class=\"text-red-400 font-semibold\">(DoT)</span> peuvent être critiques au moment de leur application. Leurs dégâts par tour seront alors amplifiés pendant toute leur durée.",
    "Lorsque plusieurs héros participent au même donjon, l'expérience gagnée à la fin du combat est partagée équitablement entre tous les héros en vie.",
    "Les objets <span class=\"text-red-500 font-semibold\">Maudits</span> offrent des bonus plus de statistique, mais au prix de contreparties parfois mortelles. Lisez bien leurs effets avant de les équiper !",
    "Vous ne pouvez équiper qu'un seul objet <span class=\"text-amber-500 font-semibold\">Relique</span> et un seul objet <span class=\"text-fuchsia-400 font-semibold\">Épique</span> à la fois sur l'ensemble de votre équipement. Choisissez-les judicieusement !",
    "Il est impossible d'équiper deux fois le même type d'anneau sur un personnage. Chaque emplacement d'anneau doit comporter un bijou différent.",
    "Tous les types d'objets ne se valent pas : une arme donnera statistiquement beaucoup plus de Force ou de Puissance qu'un bijou, tandis qu'un plastron excellera pour vos Points de Vie et votre Armure. Optimisez vos emplacements !",
    "Votre inventaire déborde ou vous trouvez un objet inutile dans un coffre ? Vous pouvez le vendre instantanément en le <span class=\"text-red-400 font-semibold\">détruisant</span> pour récupérer un peu d'Or !",
    "La <span class=\"text-yellow-400 font-semibold\">Boutique</span> se réinitialise tous les jours à minuit. Gardez l'œil ouvert : l'objet en <span class=\"text-emerald-400 font-semibold\">Promotion</span> change toutes les deux heures.",
    "N'hésitez pas à consulter votre <span class=\"text-purple-400 font-semibold\">Grimoire</span> ! Il vous permet de voir à l'avance tous les sorts disponibles pour chaque voie et spiritualité, idéal pour planifier votre évolution.",
    "Certains monstres possèdent des <span class=\"text-purple-400 font-semibold\">Mutations</span>. Elles leur permettent de lancer des sorts dévastateurs ou d'utiliser des compétences pour s'entraider. Prudence !",
    "Le <span class=\"text-blue-400 font-semibold\">Type</span> d'un monstre (Mort-Vivant, Bête, Démon...) définit certaines modifications importante à prendre en compte. Régénération, dégats suplémentaires, débuffs, etc.",
    "Chaque monstre possède un <span class=\"text-amber-400 font-semibold\">Comportement</span> unique (Prédateur, Corrupteur, Brutal). Observez-les bien pour anticiper leur priorité de ciblage et leur comportement général !",
    "Avant de lancer un donjon, n'oubliez pas d'équiper' vos <span class=\"text-emerald-400 font-semibold\">Consommables</span> (potions, clé, corde, etc.) dans votre Inventaire de Combat. Vous pourrez les utiliser entre les affontements.",
    "En donjon, les salles de <span class=\"text-red-400 font-semibold\">Combat</span> sont fréquentes. Mais attention aux salles de <span class=\"text-orange-500 font-semibold\">Boss</span> qui mettront votre équipe à rude épreuve en boostant les monstres !",
    "Les <span class=\"text-yellow-400 font-semibold\">Salles des Trésors</span> regorgent d'or et d'objets, tandis que les salles d'<span class=\"text-blue-400 font-semibold\">Altération</span> peuvent vous soigner (ou l'inverse !) en échange d'<span class=\"text-fuchsia-400 font-semibold\">Anomalies</span> ou d'<span class=\"text-amber-400 font-semibold\">XP Spirituel</span>.",
    "Les <span class=\"text-purple-400 font-semibold\">portes étranges</span> sont des évènements aléatoires. Elles peuvent vous déboucher sur des pièges, des trésors inatendus, des marchants secret, des autels sacrificiels ou bien des monstres en embuscade... ",
    "C'est dans l'<span class=\"text-amber-500 font-semibold\">Armurerie</span> que vous pouvez gérer et équiper le matériel de vos héros. Un équipement bien pensé est la clé de la victoire !",
    "Besoin d'une plus grande équipes ? Rendez-vous dans l'<span class=\"text-emerald-400 font-semibold\">Armurerie</span> pour <span class=\"text-blue-400 font-semibold\">Recruter</span> de nouveaux héros pour compléter votre équipe.",
    "Les <span class=\"text-fuchsia-400 font-semibold\">Anomalies</span> servent comme monais ou bien comme ingredient alchimique.",
    "L'<span class=\"text-emerald-400 font-semibold\">Expérience Spirituelle</span> permet de gagner des niveaux spirituels ce qui débloquera de nouveaux sorts, mais sert aussi de ressources dans certain craft alchimique.",
    "Vous pouvez jouer en <span class=\"text-blue-400 font-semibold\">Multijoueur</span> ! Créez un <span class=\"text-emerald-400 font-semibold\">Lobby</span> et partagez le code d'invitation à un ami. Attention : il doit avoir débloqué le donjon pour pouvoir s'y aventurer avec vous.",
    "Fuir un donjon  fait perdre de l'or et de l'expérience proportionnellement à la taille du donjon. Un perso qui meurt en donjon perd aussi de l'expérience en fonction de son niveau."
];

export function playDungeonMusic(data) {
    if (!data) return;

    let musicFile = 'dunjon-calm.mp3'; // Défaut

    const secret = data.donjonSecret ? data.donjonSecret.toLowerCase() : null;

    if (!secret || secret === 'aucun' || secret === 'null') {
        const level = data.donjonLevel || 1;
        musicFile = `libre-lvl${level}.mp3`;
    } else {
        const level = data.donjonSecretLevel || 1;
        // Nettoyer le secret : minuscule, enlève les accents, remplace les espaces par des tirets
        const cleanSecret = secret.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
        musicFile = `${cleanSecret}-lvl${level}.mp3`;
    }

    const targetSrc = '/sons/' + musicFile;

    if (!window.dungeonMusic || !window.dungeonMusic.src.endsWith(targetSrc)) {
        if (window.dungeonMusic) {
            window.dungeonMusic.pause();
        }
        window.dungeonMusic = new Audio(targetSrc);
        window.dungeonMusic.loop = true;

        const savedVolume = localStorage.getItem('grimoire_music_volume');
        const savedMuted = localStorage.getItem('grimoire_music_muted');

        if (savedVolume !== null) {
            window.dungeonMusic.volume = parseInt(savedVolume) / 100;
            const slider = document.getElementById('musicVolumeSlider');
            if (slider) slider.value = savedVolume;
        } else {
            window.dungeonMusic.volume = 0.5;
            const slider = document.getElementById('musicVolumeSlider');
            if (slider) slider.value = 50;
        }

        if (savedMuted === 'true') {
            window.dungeonMusic.muted = true;
            const btn = document.getElementById('musicToggleBtn');
            if (btn) {
                btn.textContent = 'volume_off';
                btn.classList.add('text-error');
            }
        } else {
            window.dungeonMusic.muted = false;
            const btn = document.getElementById('musicToggleBtn');
            if (btn) {
                btn.textContent = 'volume_up';
                btn.classList.add('text-success');
            }
        }

        const tryPlay = () => {
            window.dungeonMusic.play().catch(e => {
                console.log("Autoplay bloqué, attente d'un clic...", e);
                const playOnInteraction = () => {
                    if (window.dungeonMusic && window.dungeonMusic.paused) {
                        window.dungeonMusic.play();
                    }
                    document.removeEventListener('click', playOnInteraction);
                };
                document.addEventListener('click', playOnInteraction);
            });
        };
        tryPlay();
    } else if (window.dungeonMusic && window.dungeonMusic.paused) {
        window.dungeonMusic.play().catch(e => {
            console.log("Autoplay bloqué, attente d'un clic...", e);
            const playOnInteraction = () => {
                if (window.dungeonMusic && window.dungeonMusic.paused) {
                    window.dungeonMusic.play();
                }
                document.removeEventListener('click', playOnInteraction);
            };
            document.addEventListener('click', playOnInteraction);
        });
    }
}