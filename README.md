## Icarus - Custom Discord bot for the [LDSG Community](https://ldsgamers.com)

Icarus is built in Node.js for the LDS Gamers community. It runs on the [Augur framework](https://bitbucket.org/Gaiwecoor/augurbot), utilizing the Discord.js library.

Pull requests from the community are welcome.

---

## The Augur Handler

Within your base file, require `augurbot` and create a new instance of `AugurClient`:
```
const {AugurClient} = require("augurbot");
const client = new AugurClient(config, options);

client.login();
```

The AugurClient will create the Discord Client, log it in using the token provided in `config.token`, listen for events, and process commands. Any gateway intents are automatically calculated based on `config.events`.

### The `config` Object

Minimum required properties in `config` include:

* `events` (array): An array of discord.js events to process, including `message` and `messageUpdate`, if your bot will be processing message commands. Gateway intents will be automatically calculated based on the `events` supplied.

Additional optional properties include:

* `db` (object): An object, including a `model` property which is the path to your database model, relative to the base file.

* `prefix` (string): A default prefix for commands. Defaults to `!`.

* `processDMs` (boolean): Whether to process messages in DMs. Defaults to `true`.

* `token` (string): Your bot's Discord token to log in. If provided in the `config` object, it does not need to be passed when `client.login()` is called. If omitted, it *must* be passed with `client.login(token)` when logging in.

* Any other properties you wish to be able to access from your command modules.

### The `options` Object

The `options` object is optional, but may include:

* `clientOptions` (object): An object containing options to be passed to the new Discord.Client(). Gateway intents are automatically calulated based on `config.events`. If you would like to override the calculated intents, provide your own intents as usual for Discord.js.

* `commands` (string): A directory, relative to the base file, containing any command modules you wish to automatically load.

* `errorHandler`: A function accepting `error` and `message` as its arguments. This will replace the default error handling function.

* `parse` (async function): An asynchronous function accepting `message` as its argument, returning an object with `command` and `suffix` properties. This will replace the default parsing function. (Useful in case different servers use different prefixes, for example.)

### AugurClient Properties

Properties of the Handler class:

* `augurOptions` (object): The options object passed to the client upon initialization.

* `clockwork` (ClockworkHandler extends Collection):

  A collection of functions to be run by an interval.
  * `register(Module)`: Registers clockwork functions from a Module. Automatically called by `client.moduleHandler.register(Module)`.
  * `unload(filepath)`: Unload a clockwork function from memory. Automatically called by `client.moduleHandler.unload(filepath)`.

* `commands` (CommandHandler extends Collection):

  A collection of commands, keyed by command name.
  * `aliases` (Collection): Collection of commands, keyed by alias.
  * `client` (AugurClient): The client.
  * `commandCount` (Number): Integer of how many commands have been executed via `commands.execute()`.
  * `execute(commandName, message, suffix)` (async function): Execute a command function. Automatically called by the event handler.
  * `register(Module)` (function): Registers commands from a Module. Automatically called by `client.moduleHandler.register(Module)`.

* `config`: The `config` object passed to the Handler.

* `db`: Your loaded database model.

* `events` (EventHandler extends Collection):

  A collection of event handlers, keyed by event then keyed by filepath.
  * `register(Module)`: Registers event handlers from a Module. Automatically called by `client.moduleHandler.register(Module)`.

* `moduleHandler` (ModuleHandler):

  Helper functions for loading/unloading/reloading Augur Modules.
  * `register(Module, data)`: Register the module with optional data.
  * `reload(filepath)`: Reload a module from a filepath, reregistering the module with data supplied by the command's `.unload()` function.
  * `unload(filepath)`: Unload a module from memory.

### AugurClient Methods

Methods of the Handler class:

* `errorHandler(error, message)`: Error handling function.

* `parse(message)`: Parse a message into its command name and suffix. Returns an object containing `command` (string) and `suffix` (string).

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

* `client`: The Augur client which loaded the command module.

All of the following methods are chainable:

### Clockwork
The function passed to the `.setClockwork()` method should return an interval which will continue to run in the background. The interval is cleared and reloaded when the module is reloaded. Note that the clockwork function is run *after* the intialization function.
```
Module.setClockwork(function() {
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
