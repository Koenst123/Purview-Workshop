/* Alleen vaste leerkeuzes; klantontwerpen en vrije invoer horen nooit in deze opslag. */
const LEARNING_KEY = STORAGE_KEY + "-learning";
const Learning = {
  version: 1, limit: 128 * 1024, entries: {}, stored: {}, error: "", blocked: false,
  report(text, cause) {
    if (this.error !== text) {
      console.error("Leervoortgang:", text, cause || "");
      Toast.show(text, "warn", 7000);
    }
    this.error = text;
  },
  load() {
    let raw;
    try { raw = localStorage.getItem(LEARNING_KEY); }
    catch (e) { this.report("Deze browser kan uw leervoortgang niet lezen. Uw keuzes blijven voorlopig alleen in dit venster.", e); return; }
    if (!raw) return;
    if (raw.length > this.limit) {
      this.blocked = true;
      this.report("De opgeslagen leervoortgang is te groot. Wis de leervoortgang om opnieuw te beginnen.");
      return;
    }
    let data;
    try { data = JSON.parse(raw); }
    catch (e) {
      this.blocked = true;
      this.report("De opgeslagen leervoortgang is beschadigd. Wis de leervoortgang om opnieuw te beginnen.", e);
      return;
    }
    if (!isPlainObj(data) || data.version !== this.version || !isPlainObj(data.entries)) {
      this.blocked = true;
      this.report("Deze leervoortgang heeft een onbekende versie. Gebruik de bijbehorende appversie of wis alleen de leervoortgang.");
      return;
    }
    this.stored = data.entries;
  },
  register(name, config) {
    if (!["academy", "experience"].includes(name) || typeof config.normalize !== "function" || typeof config.reset !== "function") {
      throw new Error("Ongeldig contract voor leervoortgang");
    }
    const saved = Object.hasOwn(this.stored, name) ? this.stored[name] : null;
    const compatible = isPlainObj(saved) && saved.version === config.version;
    if (saved && !compatible) {
      this.blocked = true;
      this.report("Een leeronderdeel is gewijzigd. Wis de oude leervoortgang voordat u nieuwe keuzes bewaart.");
    }
    const data = config.normalize(compatible ? saved.data : {});
    if (!isPlainObj(data)) throw new Error("Leervoortgang moet een begrensd object zijn");
    if (compatible && !this.error && JSON.stringify(saved.data) !== JSON.stringify(data)) {
      this.report("De leeropslag bevat ongeldige of verouderde keuzes. Deze zijn niet overgenomen; geldige voortgang blijft behouden.");
    }
    this.entries[name] = { ...config, data };
    return config.normalize(data);
  },
  save(name, value) {
    const entry = Object.hasOwn(this.entries, name) ? this.entries[name] : null;
    if (!entry) throw new Error("Onbekend leeronderdeel");
    entry.data = entry.normalize(value);
    if (this.blocked) {
      Toast.show(this.error, "warn", 7000);
      return false;
    }
    const entries = {};
    for (const key of ["academy", "experience"]) {
      const e = this.entries[key];
      if (e) entries[key] = { version: e.version, data: e.data };
    }
    const text = JSON.stringify({ version: this.version, entries });
    if (text.length > this.limit) {
      this.report("Uw leervoortgang past niet in de lokale opslag. Nieuwe keuzes blijven alleen in dit venster.");
      return false;
    }
    try { localStorage.setItem(LEARNING_KEY, text); this.error = ""; return true; }
    catch (e) {
      this.report("Uw leervoortgang kon niet worden bewaard. Nieuwe keuzes blijven alleen in dit venster; probeer opnieuw of maak opslagruimte vrij.", e);
      return false;
    }
  },
  clear(name) {
    const entry = Object.hasOwn(this.entries, name) ? this.entries[name] : null;
    if (!entry) throw new Error("Onbekend leeronderdeel");
    const previous = entry.data;
    if (!this.save(name, {})) { entry.data = previous; return false; }
    entry.reset();
    return true;
  },
  clearAll() {
    try { localStorage.removeItem(LEARNING_KEY); }
    catch (e) { this.report("De leervoortgang kon niet worden gewist. Probeer het opnieuw via de browserinstellingen.", e); return false; }
    this.stored = {};
    this.blocked = false;
    this.error = "";
    for (const entry of Object.values(this.entries)) { entry.data = entry.normalize({}); entry.reset(); }
    return true;
  },
};
Learning.load();
