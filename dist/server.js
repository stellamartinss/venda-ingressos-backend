"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const auth_1 = __importDefault(require("./routes/auth"));
const events_1 = __importDefault(require("./routes/events"));
const orders_1 = __importDefault(require("./routes/orders"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const admin_1 = __importDefault(require("./routes/admin"));
const organizer_1 = __importDefault(require("./routes/organizer"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.use('/auth', auth_1.default);
app.use('/events', events_1.default);
app.use('/orders', orders_1.default);
app.use('/dashboard', dashboard_1.default);
app.use('/admin', admin_1.default);
app.use('/organizer', organizer_1.default);
// Basic error handler
app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});
app.listen(env_1.config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${env_1.config.port}`);
});
//# sourceMappingURL=server.js.map