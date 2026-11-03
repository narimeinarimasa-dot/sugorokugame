const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

app.use(express.static('public'));

// 各マスの思い出イベント（お母さんの人生の歴史）
// 【server.js の上部を以下に差し替え・追加】

const MAP_EVENTS = {
    0: "スタート！お母さんの人生すごろくが はじまった！",
    1: "【生誕】お母さんがこの世に誕生！世界がほんのり温かくなった。",
    2: "【幼少期】泥遊びが大好きだった少女時代。お母さんの伝説がここから始まる。",
    3: "【学生時代】部活に青春を捧げた日々。テストの点数は「ヒミツ」とお母さんは微笑んでいる。",
    4: "【お父さんとの出会い】運命の出会い。お父さんの第一印象は「特に記憶にない」らしい。",
    5: "【プロポーズ】お父さんの一世一代のプロポーズ！お母さんは快諾した（ということになっている）。",
    6: "【結婚式】人生の晴れ舞台。ドレス姿のお母さんは世界で一番綺麗だった！",
    7: "【新生活】慣れない土地での新婚生活。料理のレパートリーが爆発的に増えた！",
    8: "【第一子誕生】命がけで子どもを産んでくれた日。お母さん、本当にお疲れ様！",
    9: "【夜泣きバトル】毎晩の夜泣きをあやし続けた。お母さんの精神力が 100 上がった！",
    10: "【初めての旅行】家族で行った初めての温泉旅行。カニを剥くスピードが神がかり始める。",
    11: "【反抗期をスルー】子どもの反抗期を、お母さんは自慢のマシンガントークで完全論破した！",
    12: "【お弁当の思い出】毎日作ってくれた美味しいお弁当。卵焼きの味は一生忘れません。",
    13: "【パート開始】新しい仕事を始めたお母さん。職場でも持ち前の明るさでムードメーカーに！",
    14: "【趣味の開花】お母さんが新しい趣味（お母さんの実際の趣味をここに書く）に目覚めた！",
    15: "【大ピンチ】お父さんがおやつを勝手に食べてお母さんが激怒！お父さんは3日間平謝りした。",
    16: "【家族会議】これからの家族の未来について語り合った思い出の夜。",
    17: "【最近のニュース】スマホの操作に慣れてきて、家族LINEにスタンプを連打するお母さん。",
    18: "【誕生日の前夜】家族みんながソワソワしながら、このゲームを隠れて作っていた形跡を発見！",
    19: "【ゴールの手前】いよいよ誕生日会場が見えてきた！みんなでお母さんへの感謝を叫ぼう！",
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
            if (player.pos > 20) player.pos = 20; // ゴールは6マス目

            // メッセージの更新（止まったマスのイベントテキストを取得）
            const eventText = MAP_EVENTS[player.pos] || "平穏な日常が過ぎていく。";
            gameState.currentMessage = `【${player.name}】がサイコロを振って【 ${dice} 】が出た！\n\n${eventText}`;

            // ゴール判定（お母さんがゴールしたか、または誰かがゴールした時点で次のターンへ行かない）
            if (player.pos === 20) {
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
