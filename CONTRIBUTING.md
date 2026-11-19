# Contributing to Athom and Homey

First off all, thank you for taking the time to contribute!

The following is a set of guidelines for contributing to Athom and its packages, which are hosted in the [Athom Organization](https://github.com/athombv) on GitHub. These are just guidelines, not rules. Use your best judgment, and feel free to contact us if you have any questions.

Please join our [community slack](https://slack.athom.com), if you have not done so already.
We also have a [community forum](https://community.homey.app) for general discussions.


## Before submitting a bug or feature request

* **Have you actually read the error message**?
* Have you searched for similar issues?
* Have you updated homey, all apps, and the development tools (if applicable)?
* Have you checked that it's not a problem with one of the apps you're using, rather than Homey itself?
* Have you looked at what's involved in fixing/implementing this?
 
Capable programmers should always attempt to investigate and fix problems themselves before asking for others to help. Submit a pull request instead of an issue!

## A great bug report contains

* Context – what were you trying to achieve?
* Detailed steps to reproduce the error from scratch. Try isolating the minimal amount of code needed to reproduce the error.
* Any applicable log files or ID's.
* Evidence you've looked into solving the problem and ideally, a theory on the cause and a possible solution.

## A great feature request contains

* The current situation.
* How and why the current situation is problematic.
* A detailed proposal or pull request that demonstrates how the problem could be solved.
* A use case – who needs this feature and why?
* Any caveats.

## A great pull request contains

* Minimal changes. Only submit code relevant to the current issue. Other changes should go in new pull requests.
* Minimal commits. Please squash to a single commit before sending your pull request.
* No conflicts. Please rebase off the latest master before submitting.
* Code conforming to the existing conventions and formats. i.e. Please don't reformat whitespace.
* Passing tests in the test folder (if applicable). Use existing tests as a reference.
* Relevant documentation.

## Speeding up your pull request
Merging pull requests takes time. While we always try to merge your pull request as soon as possible, there are certain things you can do to speed up this process.

* Ask developers to review your code changes and post their feedback.
* Ask users to test your changes and post their feedback.
* Keep your changes to the minimal required amount, and dedicated to one issue/feature only.

## Working on the experimental Homevolt battery energy counters

The battery-energy change in this fork is an **unreleased proposal**. Before
changing its implementation or asking the upstream maintainer to review it:

1. Read [the design and direction mapping](docs/battery-energy-counters.md)
   and [the field observations](docs/battery-energy-validation.md). Distinguish
   measured facts from assumptions about other hardware and firmware.
2. Follow the [test, deployment and rollback checklist](docs/battery-energy-testing.md).
   Run `npm ci`, `npm run test:energy`, `npm run lint:energy`, and
   `node --check drivers/homevolt-battery/device.js`; include actual results
   and relevant environments in your PR. The inherited full-project
   `npm run lint` currently reports unrelated upstream style errors.
3. Add focused tests for changed counter direction, units, initialization,
   persistence, resets, multiple EMS units and unusual firmware values.
4. Keep this energy fix independent of battery schedules, control modes,
   authentication, grid/solar sensors and unrelated formatting changes.
5. Never attach an unredacted `/ems.json`, network address, device serial,
   token, password, QR code, account identifier or private Homey data to a
   public issue or PR. Use sanitized minimal examples.
6. Prefer a draft PR for incomplete work. Request upstream review only after
   clearly disclosing unfinished real-hardware validation and known risks.

Please respect the existing upstream project's GPL-3.0 license, attribution,
review conventions and release process. A public fork is not an official
upstream release.
