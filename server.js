const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

app.use(express.static('public'));

// 各マスの思い出イベント（お母さんの人生の歴史）
// 【server.js の上部を以下に差し替え・追加】

// 【server.js の上部：マスの種類とイベントの定義】

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

// 【重要】server.js の中の「player.pos > 6」や「player.pos === 6」をすべて「20」に書き換えてください！
// 例：
// if (player.pos > 20) player.pos = 20;
// if (player.pos === 20) { ... }
// 【server.js のgameStateの定義部分にbattleStateを追加】
let gameState = {
    players: {}, 
    turnIdx: 0,
    socketIds: [],
    currentMessage: "家族みんなが参加するのを待っている...",
    // --- 追加：戦闘管理用ステータス ---
    battleState: {
        inBattle: false,
        activePlayerId: null,
        enemies: [] // 出現した敵の配列 [{ name: "ちっちゃいハエ", hp: 15 }]
    }
};

// 敵キャラクターのプール
const ENEMY_POOL = [
    { name: "おんちなオウム", hp: 20, atk: 6 },
    { name: "きまぐれなノラいぬ", hp: 25, atk: 8 },
    { name: "にやにやにわとり", hp: 15, atk: 5 },
    { name: "ちっちゃいハエ", hp: 10, atk: 3 }
];

// 4人分のコマの色
const COLORS = ['#ff6b6b', '#4dadff', '#51cf66', '#fcc419'];

io.on('connection', (socket) => {
    console.log('ユーザー接続:', socket.id);

    // 参加処理
// 【server.js 内の socket.on('join_game', ...) の中身を以下に修正】

    socket.on('join_game', (data) => {
        if (!gameState.players[socket.id]) {
            const playerNum = Object.keys(gameState.players).length;
            const isMom = data.name.includes("ママ") || data.name.toLowerCase() === "mom";
            
            // 各プレイヤーにMOTHER風の初期ステータスを付与
            gameState.players[socket.id] = {
                name: data.name,
                pos: 0,
                color: COLORS[playerNum % COLORS.length],
                isMom: isMom,
                // --- 追加ステータス ---
                hp: isMom ? 50 : 30,       // ママはちょっとタフに
                attack: isMom ? 15 : 10,   // ママはちょっと強めに
                defence: isMom ? 8 : 5,
                lv: 1,
                ex: 0
            };
            gameState.socketIds.push(socket.id);
            gameState.currentMessage = `${data.name}が 仲間になった！\n(LV:1 / HP:${gameState.players[socket.id].hp})`;
        }
        io.emit('state_update', gameState);
    });

// 【server.js の socket.on('roll_dice', ...) の中身を以下に丸ごと差し替え】
// 【io.on('connection', ...) 内の socket.on('roll_dice', ...) を以下に差し替え】
    socket.on('roll_dice', () => {
        // 戦闘中でない場合のみサイコロが振れる
        if (!gameState.battleState.inBattle && gameState.socketIds[gameState.turnIdx] === socket.id) {
            const dice = Math.floor(Math.random() * 3) + 1; // 1〜3進む
            const player = gameState.players[socket.id];
            
            let encounteredEnemies = [];
            
            // 【1マス進むごとに15%の確率でエンカウント判定（複数検知）】
            for (let m = 0; m < dice; m++) {
                player.pos += 1;
                if (player.pos > 20) {
                    player.pos = 20;
                    break;
                }
                
                // 15%の確率を引いたか（※スタートとゴール、SHOP・アイテムマスは安全地帯とする）
                const massType = MASS_TYPES[player.pos];
                if (massType === "normal" && player.pos !== 20) {
                    if (Math.random() < 0.15) {
                        // 敵プールからランダムに1体選んでコピー（HPを独立させるため）
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

            const massType = MASS_TYPES[player.pos];
            let eventText = MAP_EVENTS[player.pos] || "平穏な日常が過ぎていく。";

            // 戦闘に遭遇した場合
            if (encounteredEnemies.length > 0) {
                gameState.battleState.inBattle = true;
                gameState.battleState.activePlayerId = socket.id;
                gameState.battleState.enemies = encounteredEnemies;

                let enemyNames = encounteredEnemies.map(e => `「${e.name}」`).join(' と ');
                gameState.currentMessage = `【${player.name}】がサイコロを振って【 ${dice} 】マス進んだ！\n\nうわっと！ 道中で ${enemyNames} が あらわれた！\n戦闘開始だ！`;
            } else {
                // 通常の移動処理（以前のロジックと同じ）
                let levelUpText = "";
                if (massType === "item") {
                    eventText += "\n\n▶ [アイテムを 1つ 手に入れた！（仮）]";
                } else if (massType === "shop") {
                    eventText += "\n\n▶ [お店が開いた！好きなカードを 買える（仮）]";
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

                if (player.pos === 20) {
                    // ゴール時
                } else {
                    gameState.turnIdx = (gameState.turnIdx + 1) % gameState.socketIds.length;
                }
            }
            
            io.emit('state_update', gameState);
        }
    });

    // 【追加：たたかうボタンが押されたときの処理】
    socket.on('battle_attack', () => {
        const bState = gameState.battleState;
        if (bState.inBattle && bState.activePlayerId === socket.id) {
            const player = gameState.players[socket.id];
            // 先頭の敵を攻撃する
            const enemy = bState.enemies[0];
            
            // プレイヤーの攻撃（ダメージ計算：攻撃力 - 防御(仮で一律2)）
            const damageToEnemy = Math.max(1, player.attack - 2);
            enemy.hp -= damageToEnemy;

            let battleLog = `${player.name}の こうげき！\n${enemy.name}に ${damageToEnemy} の ダメージを与えた！\n`;

            // 敵を倒したか判定
            if (enemy.hp <= 0) {
                battleLog += `▼ ${enemy.name}を たおした！\n`;
                bState.enemies.shift(); // 倒した敵を配列から消す
            }

            // まだ敵が残っている場合、生き残っている先頭の敵から反撃を受ける
            if (bState.enemies.length > 0) {
                const activeEnemy = bState.enemies[0];
                // 敵の攻撃（ダメージ計算：敵の攻撃力 - プレイヤーの防御）
                const damageToPlayer = Math.max(1, activeEnemy.atk - Math.floor(player.defence / 2));
                player.hp -= damageToPlayer;
                battleLog += `▼ ${activeEnemy.name}の はんげき！\n${player.name}は ${damageToPlayer} の ダメージを受けた！\n`;
                
                // お母さんや家族が気絶しないようにHPが0以下になったら1で耐えるやさしさ設計
                if (player.hp <= 0) player.hp = 1; 
            }

            // すべての敵を倒して勝利した場合
            if (bState.enemies.length === 0) {
                const bonusEx = 15;
                player.ex += bonusEx;
                battleLog += `\n勝利した！ 経験値を 【 ${bonusEx} 】 獲得！\nみんなの平和が まもられた。`;
                
                // 戦闘を終了し、手番を次の人に回す
                bState.inBattle = false;
                bState.activePlayerId = null;
                gameState.turnIdx = (gameState.turnIdx + 1) % gameState.socketIds.length;
            }

            gameState.currentMessage = `💥 【戦闘中】残りの敵: ${bState.enemies.length}体\n\n${battleLog}`;
            io.emit('state_update', gameState);
        }
    });

            // メッセージウィンドウに合体させて表示
            gameState.currentMessage = `【${player.name}】がサイコロを振って【 ${dice} 】が出た！\n\n${eventText}${levelUpText}`;

            // ゴール判定
            if (player.pos === 20) {
                // ゴール時は手番を動かさない
            } else {
                gameState.turnIdx = (gameState.turnIdx + 1) % gameState.socketIds.length;
            }
            
            io.emit('state_update', gameState);
        }
    });
    
    // 切断処理
    socket.on('disconnect', () => {
        gameState.socketIds = gameState.socketIds.filter(id => id !== socket.id);
        delete gameState.players[socket.id];
        if (gameState.turnIdx >= gameState.socketIds.length) gameState.turnIdx = 0;
        io.emit('state_update', gameState);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
