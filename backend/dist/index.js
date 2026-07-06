"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const grammy_1 = require("grammy");
const api_1 = require("./api");
const strava_1 = require("./api/strava");
const bot_1 = require("./bot");
const app = (0, express_1.default)();
const port = Number(process.env.PORT ?? 3000);
const webhookPath = process.env.BOT_WEBHOOK_PATH ?? '/telegram/webhook';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Теперь __dirname это /app/backend/dist, а public лежит в /app/backend/dist/public
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
app.use('/api', api_1.apiRouter);
app.use('/strava', strava_1.stravaRouter);
app.use(webhookPath, (0, grammy_1.webhookCallback)(bot_1.bot, 'express'));
app.get('*', (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'index.html'));
});
async function start() {
    if (process.env.BOT_WEBHOOK_URL) {
        await bot_1.bot.api.setWebhook(new URL(webhookPath, process.env.BOT_WEBHOOK_URL).toString());
    }
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}
void start();
