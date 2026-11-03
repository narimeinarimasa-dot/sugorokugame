const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

app.use(express.static('public'));

// 各マスの思い出イベント（お母さんの人生の歴史）
const MAP_EVENTS = {
    0: "スタート！お母さんの人生すごろくが はじまった！",
    1: "【思い出の学校】お母さんの学生時代。部活に恋に大忙しだったらしい。レベルが上がった！",
    2: "【お父さんとの出会い】運命の出会い。お父さんの第一印象は「特に記憶にない」とお母さんは語る。",
    3: "【私が生まれた日】お母さんが命がけで私を産んでくれた日。本当にありがとう！",
    4: "【家族旅行の温泉】みんなで行った温泉旅行。お母さんがカニを剥くスピードが神がかっていた。",
    5: "【最近のニュース】お母さんが欲しがっていたあのアイテムをみんなでこっそり内緒にするイベントが発生！",
    6: "ゴール！！！🎉 お母さん、お誕生日おめでとう！いつも本当にありがとう！最高の1年にしようね！"
};

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
    socket.on('join_game', (data) => {
        if (!gameState.players[socket.id]) {
            const playerNum = Object.keys(gameState.players).length;
            const isMom = data.name.includes("お母さん") || data.name.toLowerCase() === "mom";
            
            gameState.players[socket.id] = {
                name: data.name,
                pos: 0,
                color: COLORS[playerNum % COLORS.length],
                isMom: isMom
            };
            gameState.socketIds.push(socket.id);
            gameState.currentMessage = `${data.name}が 仲間になった！`;
        }
        io.emit('state_update', gameState);
    });

    // サイコロ処理
    socket.on('roll_dice', () => {
        if (gameState.socketIds[gameState.turnIdx] === socket.id) {
            const dice = Math.floor(Math.random() * 3) + 1; // 1〜3進む
            const player = gameState.players[socket.id];
            
            player.pos += dice;
            if (player.pos > 6) player.pos = 6; // ゴールは6マス目

            // メッセージの更新（止まったマスのイベントテキストを取得）
            const eventText = MAP_EVENTS[player.pos] || "平穏な日常が過ぎていく。";
            gameState.currentMessage = `【${player.name}】がサイコロを振って【 ${dice} 】が出た！\n\n${eventText}`;

            // ゴール判定（お母さんがゴールしたか、または誰かがゴールした時点で次のターンへ行かない）
            if (player.pos === 6) {
                // ゴール時は手番を動かさない
            } else {
                // ターンを次のプレイヤーに回す
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