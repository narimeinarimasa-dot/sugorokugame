const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

app.use(express.static('public'));

// 50マスの種類定義（ normal:通常, item:アイテム, shop:お店, plus:お金プラス, minus:お金マイナス ）
// 50マスの種類定義（角カッコを使わない安全な書き方）
const MASS_TYPES = {};
const SHOP_SQUARES = new Array(5, 15, 25, 35, 45);
const ITEM_SQUARES = new Array(2, 10, 18, 28, 38, 48);
const PLUS_SQUARES = new Array(3, 8, 13, 19, 24, 31, 37, 42, 47);
const MINUS_SQUARES = new Array(6, 17, 29, 40, 44);

for (let i = 0; i <= 50; i++) {
    if (SHOP_SQUARES.includes(i)) MASS_TYPES[i] = "shop";
    else if (ITEM_SQUARES.includes(i)) MASS_TYPES[i] = "item";
    else if (PLUS_SQUARES.includes(i)) MASS_TYPES[i] = "plus";
    else if (MINUS_SQUARES.includes(i)) MASS_TYPES[i] = "minus";
    else MASS_TYPES[i] = "normal";
}

// 50マスのイベント文章（11/8までに自由にお母さんの思い出に変えてね！）
const MAP_EVENTS = {
    0: "スタート！すごろくが はじまった！",
    1: "普通マス！",
    2: "【アイテムマス】不思議なプレゼント箱が 落ちている！",
    3: "普通マス！",
    4: "普通マス！",
    5: "【SHOPマス】『どせいさんショップ』に やってきた！",
    6: "普通マス！",
    7: "普通マス！",
    8: "普通マス！",
    9: "普通マス！",
    10: "【アイテムマス】葉っぱがアイテムマスになって現れた！",
    11: "普通マス！",
    12: "普通マス！",
    13: "普通マス！",
    14: "普通マス！",
    15: "【SHOPマス】『桃太郎ランド売店』に やってきた！",
    16: "普通マス！",
    17: "普通マス！。",
    18: "【アイテムマス】思い出の詰まった古いアルバムを発見！",
    19: "普通マス！",
    20: "普通マス！",
    // --- 21〜49マス（50マス用の新しいイベント） ---
    21: "普通マス！。",
    22: "普通マス！。",
    23: "普通マス！",
    24: "普通マス！",
    25: "【SHOPマス】『ハピネスショップ』に やってきた！",
    26: "普通マス！",
    27: "普通マス！",
    28: "【アイテムマス】引き出しの奥から懐かしい家族写真が出てきた！",
    29: "普通マス！",
    30: "普通マス！",
    31: "普通マス！",
    32: "普通マス！",
    33: "普通マス！",
    34: "普通マス！",
    35: "【SHOPマス】『スカイショップ』に やってきた！",
    36: "普通マス！",
    37: "普通マス！",
    38: "【アイテムマス】ゴールへのエネルギーが湧いてくる不思議な木の実を発見！",
    39: "普通マス！",
    40: "普通マス！",
    41: "普通マス！",
    42: "普通マス！",
    43: "普通マス！",
    44: "普通マス！",
    45: "【SHOPマス】『最後のひみつ基地売店』に やってきた！",
    46: "普通マス！",
    47: "ゴールはもう目の前！",
    48: "【アイテムマス】パーティー会場への招待状がカバンに飛び込んできた！",
    49: "あと1マス！ゴール到達の叫ぶ準備をしよう！",
    50: "ゴール！！！🎉"
};

let gameState = {
    players: {}, 
    turnIdx: 0,
    socketIds: [],
    currentMessage: "みんなが参加するのを待っている...",
    battleState: { inBattle: false, activePlayerId: null, enemies: [] },
    shopState: { inShop: false, activePlayerId: null, mode: "menu" }
};

const ENEMY_POOL = [
    { name: "おんちなオウム", hp: 40, atk: 6 },
    { name: "きまぐれなノラいぬ", hp: 45, atk: 10 },
    { name: "にやにやにわとり", hp: 35, atk: 8 },
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
                maxHp: isMom ? 50 : 30, // 最大HPを記録
                attack: isMom ? 15 : 10,   
                defence: isMom ? 8 : 5,
                lv: 1,
                ex: 0,
                money: 100,
                items: [],
                expressMode: false 
            };
            gameState.socketIds.push(socket.id);
            gameState.currentMessage = `${data.name}が 仲間になった！\n(LV:1 / HP:${gameState.players[socket.id].hp})`;
        }
        io.emit('state_update', gameState);
    });

    socket.on('roll_dice', () => {
        if (!gameState.battleState.inBattle && !gameState.shopState.inShop && gameState.socketIds[gameState.turnIdx] === socket.id) {
            const player = gameState.players[socket.id];
            
            let maxDice = player.expressMode ? 6 : 3;
            const dice = Math.floor(Math.random() * maxDice) + 1; 
            
            if (player.expressMode) player.expressMode = false;

            let encounteredEnemies = [];
            let isBossBattle = false; // ★ボス戦かどうかのフラグ
            
            for (let m = 0; m < dice; m++) {
                player.pos += 1;
                if (player.pos > 50) { 
                    player.pos = 50;
                    break;
                }
                
                // ★【新規追加】30マス目を踏む、または通過した時に50%の確率で中ボスが出現！
                if (player.pos === 30) {
                    if (Math.random() < 0.50) {
                        encounteredEnemies = [{
                            name: "⚡きょだいなアリ（中ボス）",
                            hp: 150,       // 通常の敵の2倍〜3倍タフ！
                            maxHp: 150,
                            atk: 18       // 攻撃力もかなり高い！
                        }];
                        isBossBattle = true;
                        break; // ボスが出現したらそのマスで移動を強制ストップして戦闘へ
                    }
                }
                
                // 通常マスのエンカウント判定（30マス目でボスが出なかった場合、または他の通常マス）
                const massType = MASS_TYPES[player.pos] || "normal";
                if (massType === "normal" && player.pos !== 50 && player.pos !== 0 && player.pos !== 30) {
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

                // ② ★ここを書き換えます！（通常マスのエンカウント判定）
                const massType = MASS_TYPES[player.pos] || "normal";
// ★ normal に加えて、plus と minus でもエンカウントするように変更
if ((massType === "normal" || massType === "plus" || massType === "minus") && player.pos !== 50 && player.pos !== 0 && player.pos !== 30) {
    if (Math.random() < 0.2) {
        const template = ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)];
        
        const powerScale = 0.8 + Math.random() * 1.2;
        const randomHp = Math.round(template.hp * powerScale);
        const randomAtk = Math.round(template.atk * powerScale);
        const prefix = powerScale >= 1.3 ? "💢凶暴な " : "";

        encounteredEnemies.push({
            name: prefix + template.name,
            hp: randomHp,
            maxHp: randomHp,
            atk: randomAtk,
            isStrong: powerScale >= 1.3
        });
    }
}
            let eventText = MAP_EVENTS[player.pos] || "平穏な日常が過ぎていく。";

            if (encounteredEnemies.length > 0) {
                gameState.battleState.inBattle = true;
                gameState.battleState.activePlayerId = socket.id;
                gameState.battleState.enemies = encounteredEnemies;

                if (isBossBattle) {
                    // ★ボス戦専用の熱いメッセージ
                    gameState.currentMessage = `【${player.name}】がサイコロを振って 30マス目に 到着した…\n\n‼️おっとーーっと！！ 空気が 一変した！！\nそびえ立つ お前の場所の守護者\n『${encounteredEnemies[0].name}』が 立ちはだかった！\n全員で お母さんを守るんだ！！`;
                } else {
                    let enemyNames = encounteredEnemies.map(e => `「${e.name}」`).join(' と ');
                    gameState.currentMessage = `【${player.name}】がサイコロを振って【 ${dice} 】マス進んだ！\n\nうわっと！ 道中で ${enemyNames} が あらわれた！\n戦闘開始だ！`;
                }
            } else {
                let levelUpText = "";
                if (massType === "item") {
                    const allItemPool = ["ち力のバット", "お母さんのおむすび", "急行カード", "テレポートカード", "ぶっとびカード", "おうじょのえーる"];
                    const randomItem = allItemPool[Math.floor(Math.random() * allItemPool.length)];
                    
                    if (player.items.length >= 5) {
                        eventText += `\n\n🎁 不思議な箱を開けたが、🎒バッグがいっぱいだった！\n何も手に入らなかった…`;
                    } else {
                        player.items.push(randomItem);
                        eventText += `\n\n🎁 箱の中から 【${randomItem}】を みつけた！\n🎒バッグに 大切に しまった。`;
                    }
                } else if (massType === "shop") {
                    gameState.shopState.inShop = true;
                    gameState.shopState.activePlayerId = socket.id;
                    gameState.shopState.mode = "menu";
                    eventText += `\n\n🛒 お店が開いた！\n何を お買い物 しますか？`;
                // ↓↓↓ ここから追加 ↓↓↓
                } else if (massType === "plus") {
                    const baseGain = Math.floor(Math.random() * 41) + 20;
                    const gainMoney = player.isMom ? baseGain + 20 : baseGain;
                    player.money += gainMoney;
                    eventText += `\n\n💰 【プラスマス】臨時収入だ！\nお小遣いを 【 ${gainMoney}＄ 】 手に入れた！`;
                } else if (massType === "minus") {
                    const baseLoss = Math.floor(Math.random() * 31) + 15;
                    const actualLoss = Math.min(player.money, baseLoss);
                    player.money -= actualLoss;
                    eventText += `\n\n💸 【マイナスマス】うっかり出費が発生！\nお小遣いを 【 ${actualLoss}＄ 】 失ってしまった…`;
                // ↑↑↑ ここまで追加 ↑↑↑
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
                        player.hp += hpPlus; player.maxHp += hpPlus; player.attack += atkPlus; player.defence += defPlus;
                        levelUpText = `\n\n🎵 おめでとう！ ${player.name}は レベル ${player.lv} になった！\n・最大ＨＰが ${hpPlus} あがった！\n・ＯＦが ${atkPlus} あがった！`;
                    }
                }

                gameState.currentMessage = `【${player.name}】がサイコロを振って【 ${dice} 】が出た！\n\n${eventText}${levelUpText}`;

                if (player.pos === 50 || massType === "shop") {
                    // ゴール、またはSHOP到達時は手番を回さない
                } else {
                    // 手番移行と1回休みスキップの処理
                    gameState.turnIdx = (gameState.turnIdx + 1) % gameState.socketIds.length;
                    const nextPlayerId = gameState.socketIds[gameState.turnIdx];
                    if (gameState.players[nextPlayerId] && gameState.players[nextPlayerId].skipTurn) {
                        gameState.players[nextPlayerId].skipTurn = false; 
                        gameState.currentMessage += `\n\n💤 【${gameState.players[nextPlayerId].name}】は １回休み です！`;
                        gameState.turnIdx = (gameState.turnIdx + 1) % gameState.socketIds.length; 
                    }
                }
            }
            
            io.emit('state_update', gameState);
        }
    });
    
    socket.on('battle_attack', () => {
        const bState = gameState.battleState;
        if (bState.inBattle && bState.activePlayerId === socket.id) {
            const player = gameState.players[socket.id];
            const enemy = bState.enemies.at(0); 
            
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
                const activeEnemy = bState.enemies.at(0);
                const damageToPlayer = Math.max(1, activeEnemy.atk - Math.floor(player.defence / 2));
                player.hp -= damageToPlayer;
                battleLog += `▼ ${activeEnemy.name}の はんげき！\n${player.name}は ${damageToPlayer} の ダメージを受けた！\n`;
            }

            // ★修正：プレイヤーが死んでしまった（HPが0以下になった）時のペナルティ処理
            if (player.hp <= 0) {
                const lostMoney = Math.floor(player.money / 2);
                player.money -= lostMoney; // お金半分没収
                player.hp = Math.floor(player.maxHp / 2); // HP半分で復活
                player.pos = 0; // スタート地点へ強制送還
                
                battleLog += `\n☠️ あーーっと！！ ${player.name}は ちからつきてしまった！\n▶ ペナルティ：お小遣いが ${lostMoney}＄ 減ってしまった！\n▶ スタート地点へ 搬送されました…`;
                
                // 戦闘を強制終了し、次の人のターンへ
                bState.inBattle = false;
                bState.activePlayerId = null;
                gameState.turnIdx = (gameState.turnIdx + 1) % gameState.socketIds.length;
            }
            // すべての敵を倒して勝利した場合
            else if (bState.enemies.length === 0) {
                const bonusEx = 15;
                player.ex += bonusEx;
                battleLog += `\n勝利した！ 経験値を 【 ${bonusEx} 】 獲得！\nみんなの平和が まもられた。`;
                
                bState.inBattle = false;
                bState.activePlayerId = null;
                gameState.turnIdx = (gameState.turnIdx + 1) % gameState.socketIds.length;
            }

            gameState.currentMessage = bState.inBattle 
                ? `💥 【戦闘中】残りの敵: ${bState.enemies.length}体\n\n${battleLog}`
                : `💀 バトル終了\n\n${battleLog}`;
                
            io.emit('state_update', gameState);
        }
    });
    
      // ==========================================
    // 🛒 SHOP（お買い物）関連の通信イベント
    // ==========================================

    // SHOPメニューの選択 (ステータス画面 または アイテム画面へ切り替え)
    socket.on('shop_select_menu', (mode) => {
        const sState = gameState.shopState;
        if (sState.inShop && sState.activePlayerId === socket.id) {
            if (mode === 'status') {
                sState.mode = "status";
                gameState.currentMessage = `🛒 【ショップ：ステータス強化】\nどれを 購入しますか？（それぞれ 50＄）`;
            } else if (mode === 'item') { 
                sState.mode = "item";
                gameState.currentMessage = `🛒 【ショップ：アイテム購入】\nどれを 購入しますか？（持てるのは最大5つまで）`;
            }
            io.emit('state_update', gameState);
        }
    });

    // ステータスを実際に購入する処理
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
                    player.maxHp += plus; // 最大HPも一緒に増やす
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

    // アイテムを実際に購入する処理
    socket.on('shop_buy_item', (itemName) => {
        const sState = gameState.shopState;
        if (sState.inShop && sState.activePlayerId === socket.id) {
            const player = gameState.players[socket.id];
            
            // 価格設定（新しいアイテムは高額！）
            const ITEM_PRICES = { 
                "力のバット": 30, "お母さんのおむすび": 20, "急行カード": 40,
                "テレポートカード": 120, "ぶっとびカード": 150, "おうじょのえーる": 200
            };
            const cost = ITEM_PRICES[itemName];

            if (player.items.length >= 5) {
                gameState.currentMessage = `🛒 🎒 アイテムが いっぱいです！\nこれ以上 持つことは できません。`;
            }
            else if (player.money >= cost) {
                player.money -= cost;
                player.items.push(itemName); 
                gameState.currentMessage = `🛒 ありがとうございました！\n【${itemName}】を 🎒バッグに 入れた。\nまだお買い物しますか？`;
            } else {
                gameState.currentMessage = `🛒 💸 お金が 足りないようです！\n（必要なお金: ${cost}＄ / 所持金: ${player.money}＄）`;
            }
            io.emit('state_update', gameState);
        }
    });

    // お店を出る処理（買い物を終了して次の人のターンへ）
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

    // ==========================================
    // 🎒 アイテム使用関連の通信イベント
    // ==========================================
    socket.on('use_item', (itemIdx) => {
        // 自分のターン、かつ戦闘中や買い物中でない場合のみ使用可能
        if (!gameState.battleState.inBattle && !gameState.shopState.inShop && gameState.socketIds[gameState.turnIdx] === socket.id) {
            const player = gameState.players[socket.id];
            
            // 指定されたインデックスのアイテムがあるかチェック
            if (player.items && player.items[itemIdx]) {
                // 配列からアイテムを1個取り出して完全に削除する
                const itemName = player.items.splice(itemIdx, 1)[0]; 
                let useLog = `🎒 ${player.name}は 【${itemName}】を 使った！\n\n`;

                // 表記ゆれを防ぐため「ち力のバット」「ちからのバット」両方に対応
                if (itemName === "ち力のバット" || itemName === "ちからのバット" || itemName === "力のバット") {
                    player.attack += 5;
                    useLog += `▶ 攻撃への じしんが みなぎってきた！\n【ＯＦ（攻撃力）】が 【 5 】 あがった！`;
                } 
                else if (itemName === "お母さんのおむすび") {
                    player.hp += 30;
                    if (player.hp > player.maxHp) player.hp = player.maxHp;
                    useLog += `▶ 懐かしい味がした！\n【ＨＰ】が 【 30 】 回復した！`;
                } 
                else if (itemName === "急行カード") {
                    player.expressMode = true;
                    useLog += `▶ 体が 軽くなった！\n次に振るサイコロが 【最大６マス】 にパワーアップした！`;
                } 
                else if (itemName === "テレポートカード") {
                    // 自分以外のプレイヤーのIDをリストアップ
                    const otherIds = gameState.socketIds.filter(id => id !== socket.id);
                    if (otherIds.length > 0) {
                        const targetId = otherIds[Math.floor(Math.random() * otherIds.length)];
                        const targetPlayer = gameState.players[targetId];
                        
                        // お互いの位置（pos）を入れ替える
                        const myOldPos = player.pos;
                        player.pos = targetPlayer.pos;
                        targetPlayer.pos = myOldPos;
                        
                        useLog += `▶ 空間が ぐにゃりと ゆがんだ！！\n【${player.name}】と【${targetPlayer.name}】の 位置が 入れ替わった！`;
                    } else {
                        useLog += `▶ しかし 周りに 誰もいなかった！\n（カードは むなしく 消え去った…）`;
                    }
                } 
                else if (itemName === "ぶっとびカード") {
                    // 次のターンのプレイヤーを1回休みにする
                    const nextTurnIdx = (gameState.turnIdx + 1) % gameState.socketIds.length;
                    const targetId = gameState.socketIds[nextTurnIdx];
                    const targetPlayer = gameState.players[targetId];
                    
                    if (targetPlayer && targetId !== socket.id) {
                        targetPlayer.skipTurn = true; 
                        useLog += `▶ 突風が 吹き荒れた！\n次に手番がまわってくる 【${targetPlayer.name}】は １回休みに なる！`;
                    } else {
                        useLog += `▶ しかし 風は むなしく 吹き抜けた…`;
                    }
                } 
                else if (itemName === "おうじょのえーる") {
                    player.maxHp += 10;
                    player.hp += 10;
                    player.attack += 10;
                    player.defence += 10;
                    useLog += `▶ 女神の 祝福を うけた！\nすべてのステータス（ＨＰ・ＯＦ・ＤＦ）が 永久に 【 10 】 アップした！！`;
                }

                // 全員にログと最新のステータスを通知
                gameState.currentMessage = useLog;
                io.emit('state_update', gameState);
            }
        }
    });
    // ==========================================
    // 🔌 切断処理 と サーバー起動
    // ==========================================
    socket.on('disconnect', () => {
        gameState.socketIds = gameState.socketIds.filter(id => id !== socket.id);
        delete gameState.players[socket.id];
        if (gameState.turnIdx >= gameState.socketIds.length) gameState.turnIdx = 0;
        io.emit('state_update', gameState);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
