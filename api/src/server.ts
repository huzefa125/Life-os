import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import { env } from "./config/env";
import app from "./app";

app.listen(env.PORT, () => {
    console.log(`Server is running on port localhost:${env.PORT}`);
})