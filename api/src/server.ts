import "./lib/zod-openapi-setup";

import { env } from "./config/env";
import app from "./app";

app.listen(env.PORT, () => {
    console.log(`Server is running on port localhost:${env.PORT}`);
})