## Icarus - Custom Discord bot for the [LDSG Community](https://ldsgamers.com)

Icarus is built on the [Augur framework](https://bitbucket.org/Gaiwecoor/augurbot).

Pull requests from the community are welcome.

---

## The Augur Handler

Within your base file, require `augurbot` and create a new instance of a `Handler`:
```
const Augur = require("augurbot");
const Handler = new Augur.Handler(config, options);

function loadCommands() {
  // Load commands
}

Handler.start()
.then(loadCommands);
```

The Handler will create the Discord Client, log it in, listen for events, and process commands.

### Options

Minimum properties in `config` include:

* `token` (string): Your bot's Discord token to log in.

* `prefix` (string): A default prefix for commands.

* `events` (array): An array of discord.js events to process.

* `db` (string): Path to your database model, relative to the base file.

The `options` object is optional, but may include:

* `bot` (object): An object containing options to be passed to the new Discord.Client().

* `commands` (array): An array of command files to load upon receiving the first `ready` event.

* `errorHandler` (function): An function accepting `error` and `message` as its arguments. This will replace the default error handling function.

* `parse` (function): A function accepting `message` as its argument, returning an object with `command` and `suffix` properties. This will replace the default parsing function. (Useful in case different servers use different prefixes, for example.)

### Handler Properties

Properties of the Handler class:

* `aliases`: Collection of commands, keyed by alias.

* `bot`: Instance of the Discord Client.

* `clockwork`: Collection of intervals, keyed by command file.

* `commandCount`: Number of commands processed by the Handler.

* `commands`: Collection of commands, keyed by command name.

* `config`: The `config` object passed to the Handler.

* `db`: Your loaded database model.

* `events`: Collection of arrays of event handlers, keyed by command file.

* `options`: The `options` object passed to the Handler.

* `init`: Whether the Discord Client has received its first `ready` event.

* `unload`: Collection of functions to run on unloading a command file, keyed by command file.

### Handler Methods

Methods of the Handler class:

* `errorHandler(error, message)`: Error handling function.

* `execute(commandName, message, suffix)`: Execute a command function.

* `parse(message)`: Parse a message into its command name and suffix. Returns an object containing `command` (string) and `suffix` (string).

* `register(filename)`: Register a new command module.

* `reload(filename)`: Reload a command file.

* `start()`: Log in the Discord Client and start event handlers. Returns a promise which resolves upon the first `ready` event.

* `unload(filename)`: Unload clockwork functions, event handlers, and commands associated with the command file.

---

## Command File Structure

The basic file structure:
```
const Augur = require("augurbot");
const Module = new Augur.Module();

// Add commands, event handlers, etc. as necessary.

module.exports = Module;
```

In between, you can add one or more commands and event handlers, as well as a clockwork and unload function.

`Module` properties include:

* `config`: Contents of the config object loaded with the Handler.

* `db`: The loaded database model.

* `handler`: The Augur Handler which loaded the command module.

All of the following methods are chainable:

### Clockwork
The function passed to the `.setClockwork()` method should return an interval which will continue to run in the background. The interval is cleared and reloaded when the module is reloaded. Note that the clockwork function is run *after* the intialization function.
```
Module.setClockwork(function(bot) {
  return setInterval();
});
```

### Commands
The `.addCommand()` function defines a new bot command.
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
The `.addEvent()` method adds an event handler for the various Discord.js events.
```
Module.addEvent("eventName", function(...args) {});
```

### Initialization
The `.setInit(data)` method accepts a function to run on module initialization. The `data` parameter will have a `null` value on the first run, and will contain the returned by the function defined with the `.setUnload()` method on subsequent reloads of the module.
```
Module.setInit(function(data) {});
```

### Unloading
The function passed to the `.setUnload()` method will be run when unloading or reloading the module.
```
Module.setUnload(function() {});
```
