## Icarus - Custom Discord bot for the [LDSG Community](https://ldsgamers.com)

Icarus is built on the [Augur framework](https://bitbucket.org/Gaiwecoor/augurbot).

Pull requests from the community are welcome.

---

## Command File Structure

Save your `command.js` file in the `./commands` directory.

The file begins with:
```
const Augur = require("augurbot");
const Module = new Augur.Module();
```
And finish the file with:
```
module.exports = Module;
```

In between, you can add cone or more commands and event handlers, as well as a clockwork and unload function.

### Commands
```
Module.addCommand({
  name: "commandname", // required
  aliases: [], // optional
  syntax: "", // optional
  description: "", // recommended
  info: "", // recommended
  hidden: false, // optional
  category: "General", // optional
  permissions: (msg) => true, // optional
  process: (msg, suffix) => {} // required
});
```

### Events
```
Module.addEvent("eventName", (...args) => {});
```

### Clockwork
```
Module.addClockwork((bot) => { return setInterval(); });
```

### Unload
```
Module.setUnload((bot) => {});
```
