const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

app.use(express.static('public'));

// マスの種類（normal: 通常, item: アイテム入手, shop: お店）
const MASS_TYPES = {
    0: "normal",  1: "normal",  2: "item",    3: "normal",  4: "shop",
    5: "normal",  6: "normal",  7: "item",    8: "normal",  9: "normal",
    10: "shop",   11: "normal", 12: "item",   13: "normal", 14: "normal",
    15: "normal", 16: "shop",   17: "normal", 18: "normal", 19: "item",
    20: "normal"
};

const MAP_EVENTS = {
    0: "スタート！お母さんの人生すごろくが はじまった！",
    1: "【生誕】お母さんがこの世に誕生！世界がほんのり温かくなった。",
    2: "【アイテムマス】不思議なプレゼント箱が 落ちている！",
    3: "【学生時代】部活に青春を捧げた日々。テストの点数は「ヒミツ」らしい。",
    4: "【SHOPマス】『どせいさんショップ』に やってきた！",
    5: "【プロポーズ】お父さんの一世一代のプロポーズ！お母さんは快諾した（ことになっている）。",
    6: "【結婚式】人生の晴れ舞台。ドレス姿のお母さんは世界で一番綺麗だった！",
    7: "【アイテムマス】お母さんの優しさが カタチになって現れた！",
    8: "【第一子誕生】命がけで子どもを産んでくれた日。お母さん、本当にありがとう！",
    9: "【夜泣きバトル】毎晩の夜泣きをあやし続けた。お母さんの精神力が 100 上がった！",
    10: "【SHOPマス】『桃太郎ランド売店』に やってきた！",
    11: "【反抗期をスルー】子どもの反抗期を、お母さんはマシンガントークで完全論破した！",
    12: "【アイテムマス】毎日作ってくれた美味しいお弁当の 匂いがする箱を発見！",
    13: "【パート開始】新しい仕事を始めたお母さん。職場でも持ち前の明るさでムードメーカーに！",
    14: "【趣味の開花】お母さんが新しい趣味に目覚めた！日々の生活が潤っていく。",
    15: "【大ピンチ】お父さんがおやつを勝手に食べてお母さんが激怒！お父さんは3日間平謝りした。",
    16: "【SHOPマス】『ハピネスショップ』に やってきた！",
    17: "【最近のニュース】スマホの操作に慣れてきて、家族LINEにスタンプを連打するお母さん。",
    18: "【誕生日の前夜】家族みんながソワソワしながら、このゲームを隠れて作っていた形跡を発見！",
    19: "【アイテムマス】ゴールはもう目の前！最後のエネルギーが 湧いてくる！",
    20: "ゴール！！！🎉 お母さん、お誕生日おめでとう！いつも本当にありがとう！最高の1年にしようね！"
};

let gameState = {
    players: {}, 
    turnIdx: 0,
    socketIds: [],
    currentMessage: "みんなが参加するのを待っている...",
    battleState: {
        inBattle: false,
        activePlayerId: null,
        enemies: [] 
    },
    shopState: {
        inShop: false,
        activePlayerId: null,
        mode: "menu"
    }
};

const ENEMY_POOL = [
    { name: "おんちなオウム", hp: 20, atk: 6 },
    { name: "きまぐれなノラいぬ", hp: 25, atk: 8 },
    { name: "にやにやにわとり", hp: 15, atk: 5 },
    { name: "ちっちゃいハエ", hp: 10, atk: 3 }
];

const COLORS = ['#ff6b6b', '#4dadff', '#51cf66', '#fcc419'];

io.on('connection', (socket) => {
    console.log('ユーザー接続:', socket.id);

    socket.on('join_game', (data) => {
        if (!gameState.players[socket.id]) {
            const playerNum = Object.keys(gameState.players).length;
            const isMom = data.name.includes("ママ") || data.name.toLowerCase() === "mom";
            
            gameState.players[socket.id] = {
                name: data.name,
                pos: 0,
                color: COLORS[playerNum % COLORS.length],
                isMom: isMom,
                hp: isMom ? 50 : 30,       
                attack: isMom ? 15 : 10,   
                defence: isMom ? 8 : 5,
                lv: 1,
                ex: 0,
                money: 100
            };
            gameState.socketIds.push(socket.id);
            gameState.currentMessage = `${data.name}が 仲間になった！\n(LV:1 / HP:${gameState.players[socket.id].hp})`;
        }
        io.emit('state_update', gameState);
    });

    socket.on('roll_dice', () => {
        if (!gameState.battleState.inBattle && !gameState.shopState.inShop && gameState.socketIds[gameState.turnIdx] === socket.id) {
            const dice = Math.floor(Math.random() * 3) + 1; 
            const player = gameState.players[socket.id];
            
            let encounteredEnemies = [];
            
            for (let m = 0; m < dice; m++) {
                player.pos += 1;
                if (player.pos > 20) {
                    player.pos = 20;
                    break;
                }
                
                const massType = MASS_TYPES[player.pos] || "normal";
                if (massType === "normal" && player.pos !== 20 && player.pos !== 0) {
                    if (Math.random() < 0.15) {
                        const template = ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)];
                        encounteredEnemies.push({
                            name: template.name,
                            hp: template.hp,
                            maxHp: template.hp,
                            atk: template.atk
                        });
                    }
                }
            }

            const massType = MASS_TYPES[player.pos] || "normal";
            let eventText = MAP_EVENTS[player.pos] || "平穏な日常が過ぎていく。";

            if (encounteredEnemies.length > 0) {
                gameState.battleState.inBattle = true;
                gameState.battleState.activePlayerId = socket.id;
                gameState.battleState.enemies = encounteredEnemies;

                let enemyNames = encounteredEnemies.map(e => `「${e.name}」`).join(' と ');
                gameState.currentMessage = `【${player.name}】がサイコロを振って【 ${dice} 】マス進んだ！\n\nうわっと！ 道中で ${enemyNames} が あらわれた！\n戦闘開始だ！`;
            } else {
                let levelUpText = "";
                if (massType === "item") {
                    eventText += "\n\n▶ [アイテムを 1つ 手に入れた！（仮）]";
                } else if (massType === "shop") {
                    gameState.shopState.inShop = true;
                    gameState.shopState.activePlayerId = socket.id;
                    gameState.shopState.mode = "menu";
                    eventText += `\n\n🛒 お店が開いた！\n何を お買い物 しますか？`;
                } else {
                    const gainedEx = Math.floor(Math.random() * 6) + 5; 
                    player.ex += gainedEx;
                    eventText += `\n\n▶ ${player.name}は 経験値を 【 ${gainedEx} 】 獲得した！`;

                    const nextLv = Math.floor(player.ex / 20) + 1;
                    if (nextLv > player.lv) {
                        player.lv = nextLv;
                        const hpPlus = player.isMom ? 15 : 8;
                        const atkPlus = player.isMom ? 5 : 3;
                        const defPlus = player.isMom ? 3 : 2;
                        player.hp += hpPlus; player.attack += atkPlus; player.defence += defPlus;
                        levelUpText = `\n\n🎵 おめでとう！ ${player.name}は レベル ${player.lv} になった！\n・最大ＨＰが ${hpPlus} あがった！\n・ＯＦが ${atkPlus} あがった！`;
                    }
                }

                gameState.currentMessage = `【${player.name}】がサイコロを振って【 ${dice} 】が出た！\n\n${eventText}${levelUpText}`;

                if (player.pos === 20 || massType === "shop") {
                    // ゴール時、またはSHOPマス到達時はここでは手番を回さない
                } else {
                    gameState.turnIdx = (gameState.turnIdx + 1) % gameState.socketIds.length;
                }
            }
            
            io.emit('state_update', gameState);
        }
    });

    socket.on('battle_attack', () => {
        const bState = gameState.battleState;
        if (bState.inBattle && bState.activePlayerId === socket.id) {
            const player = gameState.players[socket.id];
            const enemy = bState.enemies[0]; 
            
            const damageToEnemy = Math.max(1, player.attack - 2);
            enemy.hp -= damageToEnemy;

            let battleLog = `${player.name}の こうげき！\n${enemy.name}に ${damageToEnemy} の ダメージを与えた！\n`;

            if (enemy.hp <= 0) {
                const gainedMoney = Math.floor(Math.random() * 26) + 15;
                player.money += gainedMoney;
                battleLog += `▼ ${enemy.name}を たおした！\n▶ 【お小遣い ${gainedMoney}＄】を 手に入れた！\n`;
                bState.enemies.shift(); 
            }

            if (bState.enemies.length > 0) {
                const activeEnemy = bState.enemies[0];
                const damageToPlayer = Math.max(1, activeEnemy.atk - Math.floor(player.defence / 2));
                player.hp -= damageToPlayer;
                battleLog += `▼ ${activeEnemy.name}の はんげき！\n${player.name}は ${damageToPlayer} の ダメージを受けた！\n`;
                
                if (player.hp <= 0) player.hp = 1; 
            }

            if (bState.enemies.length === 0) {
                const bonusEx = 15;
                player.ex += bonusEx;
                battleLog += `\n勝利した！ 経験値を 【 ${bonusEx} 】 獲得！\nみんなの平和が 守られた。`;
                
                bState.inBattle = false;
                bState.activePlayerId = null;
                gameState.turnIdx = (gameState.turnIdx + 1) % gameState.socketIds.length;
            }

            gameState.currentMessage = `💥 【戦闘中】残りの敵: ${bState.enemies.length}体\n\n${battleLog}`;
            io.emit('state_update', gameState);
        }
    });

    socket.on('shop_select_menu', (mode) => {
        const sState = gameState.shopState;
        if (sState.inShop && sState.activePlayerId === socket.id) {
            if (mode === 'status') {
                sState.mode = "status";
                gameState.currentMessage = `🛒 【ショップ：ステータス強化】\nどれを 購入しますか？（それぞれ 50＄）`;
            }
            io.emit('state_update', gameState);
        }
    });

    // SHOPメニューの選択 (ステータス購入画面へ切り替え)
    socket.on('shop_buy_status', (type) => {
        const sState = gameState.shopState;
        if (sState.inShop && sState.activePlayerId === socket.id) {
            const player = gameState.players[socket.id];
            const COST = 50; 

            if (player.money >= COST) {
                player.money -= COST;
                let boostText = "";

                if (type === 'hp') {
                    const plus = player.isMom ? 20 : 10;
                    player.hp += plus;
                    boostText = `最大ＨＰが ${plus} あがった！`;
                } else if (type === 'atk') {
                    const plus = player.isMom ? 6 : 3;
                    player.attack += plus;
                    boostText = `ＯＦが ${plus} あがった！`;
                } else if (type === 'def') {
                    const plus = player.isMom ? 4 : 2;
                    player.defence += plus;
                    boostText = `ＤＦが ${plus} あがった！`;
                }

                gameState.currentMessage = `🛒 ありがとうございました！\n${player.name}の ${boostText}\nまだお買い物しますか？（それぞれ 50＄）`;
            } else {
                gameState.currentMessage = `🛒 💸 お金が 足りないようです！\n（必要なお金: 50＄ / 所持金: ${player.money}＄）`;
            }
            io.emit('state_update', gameState);
        }
    });

    socket.on('shop_leave', () => {
        const sState = gameState.shopState;
        if (sState.inShop && sState.activePlayerId === socket.id) {
            const player = gameState.players[socket.id];
            gameState.currentMessage = `🛒 「またどうぞ！」\n${player.name}は お店をあとにした。`;
            
            sState.inShop = false;
            sState.activePlayerId = null;
            sState.mode = "menu";
            gameState.turnIdx = (gameState.turnIdx + 1) % gameState.socketIds.length;
            
            io.emit('state_update', gameState);
        }
    });

    socket.on('disconnect', () => {
        gameState.socketIds = gameState.socketIds.filter(id => id !== socket.id);
        delete gameState.players[socket.id];
        if (gameState.turnIdx >= gameState.socketIds.length) gameState.turnIdx = 0;
        io.emit('state_update', gameState);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
