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
let gameState = {
    players: {}, // socketId: { name, pos, color, isMom }
    turnIdx: 0,
    socketIds: [],
    currentMessage: "家族みんなが参加するのを待っている..."
};

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

// 【io.on('connection', ...) 内の socket.on('roll_dice', ...) の中身を以下に修正】
    socket.on('roll_dice', () => {
        if (gameState.socketIds[gameState.turnIdx] === socket.id) {
            const dice = Math.floor(Math.random() * 3) + 1;
            const player = gameState.players[socket.id];
            
            player.pos += dice;
            if (player.pos > 20) player.pos = 20;

            const massType = MASS_TYPES[player.pos];
            let eventText = MAP_EVENTS[player.pos] || "平穏な日常が過ぎていく。";
            
            // マスの種類に応じた追加テキスト（ギミックの土台）
            if (massType === "item") {
                eventText += "\n\n▶ [アイテムを 1つ 手に入れた！（仮）]";
            } else if (massType === "shop") {
                eventText += "\n\n▶ [お店が開いた！好きなカードを 買える（仮）]";
            }

            gameState.currentMessage = `【${player.name}】がサイコロを振って【 ${dice} 】が出た！\n\n${eventText}`;

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
