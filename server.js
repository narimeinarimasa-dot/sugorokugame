const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

app.use(express.static('public'));

// 50マスの種類定義（ normal:通常, item:アイテム, shop:お店 ）
const MASS_TYPES = {};
for (let i = 0; i <= 50; i++) {
    if ([5, 15, 25, 35, 45].includes(i)) MASS_TYPES[i] = "shop";
    else if ([2, 10, 18, 28, 38, 48].includes(i)) MASS_TYPES[i] = "item";
    else MASS_TYPES[i] = "normal";
}

// 50マスのイベント文章（11/8までに自由にお母さんの思い出に変えてね！）
const MAP_EVENTS = {
    0: "スタート！お母さんの人生すごろくが はじまった！",
    1: "【誕生】お母さんがこの世に誕生！世界がほんのり温かくなった。",
    2: "【アイテムマス】不思議なプレゼント箱が 落ちている！",
    3: "【幼少期】泥遊びが大好きだった少女時代。伝説がここから始まる。",
    4: "平穏な日常。お母さんの笑顔が家族を明るくする。",
    5: "【SHOPマス】『どせいさんショップ』に やってきた！",
    6: "【学生時代】部活に青春を捧げた日々。テストの点数は秘密らしい。",
    7: "【お父さんとの出会い】運命の出会い。第一印象は「特に記憶にない」とお母さん。",
    8: "【プロポーズ】お父さんの一世一代のプロポーズ！お母さんは快諾した（ことになっている）。",
    9: "【結婚式】人生の晴れ舞台。ドレス姿のお母さんは世界で一番綺麗だった！",
    10: "【アイテムマス】お母さんの優しさが カタチになって現れた！",
    11: "【新居へ移動】慣れない土地での新婚生活。料理のレパートリーが爆発的に増えた！",
    12: "【第一子誕生】命がけで子どもを産んでくれた日。お母さん、本当にありがとう！",
    13: "【夜泣きバトル】毎晩の夜泣きをあやし続けた。お母さんの精神力が 100 上がった！",
    14: "家族で行った初めての温泉旅行。お母さんがカニを剥くスピードが神がかり始める。",
    15: "【SHOPマス】『桃太郎ランド売店』に やってきた！",
    16: "子どもの反抗期を、お母さんはマシンガントークで完全論破した！",
    17: "毎日作ってくれた美味しいお弁当。卵焼きの味は一生忘れません。",
    18: "【アイテムマス】思い出の詰まった古いアルバムを発見！",
    19: "新しい仕事を始めたお母さん。職場でも持ち前の明るさでムードメーカーに！",
    20: "お母さんが新しい趣味に目覚めた！日々の生活が潤っていく。",
    // --- 21〜49マス（50マス用の新しいイベント） ---
    21: "お父さんがおやつを勝手に食べてお母さんが激怒！お父さんは3日間平謝りした。",
    22: "家族みんなで映画館へ行った思い出。ポップコーンを食べすぎた。",
    23: "お母さんの得意料理（ハンバーグ）の夕食！みんなのテンションが上がった！",
    24: "ペットが家族になった日。お母さんが一番メロメロになっている。",
    25: "【SHOPマス】『ハピネスショップ』に やってきた！",
    26: "スマホの操作に慣れてきて、家族LINEにスタンプを連打するお母さん。",
    27: "断捨離を始めたお母さん。お父さんの古いコレクションがコッソリ処分されかける大ピンチ！",
    28: "【アイテムマス】引き出しの奥から懐かしい家族写真が出てきた！",
    29: "お母さんが作った特製ケーキが美味しすぎるイベントが発生！",
    30: "これからの家族の未来について、夜遅くまで語り合った思い出の夜。",
    31: "お母さんのパートのご褒美で、ちょっと良いお寿司を食べに行った！",
    32: "家族が風邪をひいた時、お母さんが一晩中看病してくれた。優しさに感謝！",
    33: "お母さんがお気に入りの服を見つけてご機嫌な一日。",
    34: "家族でドライブ旅行！助手席のお母さんの選曲が渋くて盛り上がる。",
    35: "【SHOPマス】『スカイショップ』に やってきた！",
    36: "お母さんがバッサリ髪を切ってイメチェン！家族みんなで大絶賛した。",
    37: "コタツから抜け出せない冬の日の思い出。お母さんがみかんを剥いてくれた。",
    38: "【アイテムマス】ゴールへのエネルギーが湧いてくる不思議な木の実を発見！",
    39: "お父さんがお皿洗いを手伝って、お母さんがニコニコしている平穏な夜。",
    40: "子どもが自立していく寂しさと、成長を喜ぶお母さんの温かい眼差し。",
    41: "家族みんなでカラオケ大会！お母さんの十八番が炸裂した！",
    42: "お母さんが「美味しいパン屋さん」を見つけて毎日ハッピーな週。",
    43: "お母さんの誕生日がもうすぐだと気づき、家族がソワソワし始めた形跡を発見！",
    44: "お母さんへの感謝の気持ちが、家族の心の中で限界突破するイベント発生！",
    45: "【SHOPマス】『最後のひみつ基地売店』に やってきた！",
    46: "誕生日パーティーの準備が裏で着々と進んでいるのを感じるお母さん。",
    47: "ゴールはもう目の前！家族全員がサイコロを握る手に力を込める。",
    48: "【アイテムマス】お誕生日会場への招待状がカバンに飛び込んできた！",
    49: "あと1マス！みんなでお母さんへの感謝のコールを叫ぶ準備をしよう！",
    50: "ゴール！！！🎉 お母さん、お誕生日おめでとう！いつも本当にありがとう！最高の1年にしようね！"
};

let gameState = {
    players: {}, 
    turnIdx: 0,
    socketIds: [],
    currentMessage: "家族みんなが参加するのを待っている...",
    battleState: { inBattle: false, activePlayerId: null, enemies: [] },
    shopState: { inShop: false, activePlayerId: null, mode: "menu" }
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
            const isMom = data.name.includes("お母さん") || data.name.toLowerCase() === "mom";
            
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
            
            for (let m = 0; m < dice; m++) {
                player.pos += 1;
                if (player.pos > 50) { // ★50マスに拡張
                    player.pos = 50;
                    break;
                }
                
                const massType = MASS_TYPES[player.pos] || "normal";
                if (massType === "normal" && player.pos !== 50 && player.pos !== 0) {
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
                        player.hp += hpPlus; player.maxHp += hpPlus; player.attack += atkPlus; player.defence += defPlus;
                        levelUpText = `\n\n🎵 おめでとう！ ${player.name}は レベル ${player.lv} になった！\n・最大ＨＰが ${hpPlus} あがった！\n・ＯＦが ${atkPlus} あがった！`;
                    }
                }

                gameState.currentMessage = `【${player.name}】がサイコロを振って【 ${dice} 】が出た！\n\n${eventText}${levelUpText}`;

                if (player.pos === 50 || massType === "shop") {
                    // ゴール、またはSHOP到達時は手番を回さない
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
            }

            // ★修正：プレイヤーが死んでしまった（HPが0以下になった）時のペナルティ処理
            if (player.hp <= 0) {
                const lostMoney = Math.floor(player.money / 2);
                player.money -= lostMoney; // お金半分没収
                player.hp = Math.floor(player.maxHp / 2); // HP半分で復活
                player.pos = 0; // スタート地点へ強制送還
                
                battleLog += `\n☠️ あーーっと！！ ${player.name}は ちからつきてしまった！\n▶ ペナルティ：お小遣いが ${lostMoney}＄ 減ってしまった！\n▶ お母さんの実家（スタート地点）へ 搬送されました…`;
                
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
            const ITEM_PRICES = { "ち力のバット": 50, "お母さんのおむすび": 30, "急行カード": 40 };
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
        if (!gameState.battleState.inBattle && !gameState.shopState.inShop && gameState.socketIds[gameState.turnIdx] === socket.id) {
            const player = gameState.players[socket.id];
            
            if (player.items && player.items[itemIdx]) {
                const itemName = player.items.splice(itemIdx, 1)[0]; // 選択されたアイテムを取り出す
                let useLog = `🎒 ${player.name}は 【${itemName}】を 使った！\n\n`;

                if (itemName === "ち力のバット") {
                    player.attack += 5;
                    useLog += `▶ 攻撃への じしんが みなぎってきた！ ＯＦが 5 あがった！`;
                } else if (itemName === "お母さんのおむすび") {
                    player.hp += 30;
                    if (player.hp > player.maxHp) player.hp = player.maxHp; // 最大HPを超えない
                    useLog += `▶ 懐かしい味がした！ ＨＰが 30 回復した！`;
                } else if (itemName === "急行カード") {
                    player.expressMode = true;
                    useLog += `▶ 体が 軽くなった！ 次に振るサイコロが 【最大６マス】 にパワーアップした！`;
                }

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
