import { createContactHandler } from "../../server/contact.js";
export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };
export default createContactHandler();
