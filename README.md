[![Github Actions Status](https://github.com/ballet/ballet-assemble/workflows/Main/badge.svg)](https://github.com/ballet/ballet-assemble/actions)
[![PyPI Shield](https://img.shields.io/pypi/v/ballet_assemble.svg)](https://pypi.org/project/ballet_assemble)
[![npm version](https://img.shields.io/npm/v/ballet-assemble)](https://www.npmjs.com/package/ballet-assemble)

# Assemblé

A development environment for Ballet collaborations on top of Jupyter Lab

Using Assemblé, you can develop patches for Ballet projects within Jupyter
Lab and then easily submit them as GitHub Pull Requests (PRs) in one click
without leaving your notebook.

Assemblé (pronounced "assam blay") is a ballet move that involves lifting
off the floor on one leg and landing on two.

Assemblé is composed of (1) a Python package named `ballet_assemble` for the
server extension (2) a NPM package also named `ballet-assemble` for the
frontend extension and (3) tight integration with Binder for each Ballet
project.

## Requirements

- JupyterLab >= 2.0
- Python>=3.6 (64-bit Version)

## Install

Installation can be done completely using `pip`, which installs both the
server and the frontend extensions. The frontend extension only can be
installed using `jupyter labextension install` but will not function properly
without the corresponding server extension.

```bash
pip install ballet_assemble
jupyter lab build
```

Note: You will need NodeJS to install the extension; the installation process
will complain if it is not found.

## Authenticate with GitHub

The extension provides an in-Lab experience for authenticating
with GitHub. When you open a notebook, you should see the GitHub icon to the
right on the Notebook toolbar. The icon should be grey at first, indicating
you are not authenticated. Click the icon to open a login window, in which
you can enter your GitHub username and password. These will be exchanged by
the extension for an OAuth token and will be used to propose changes to the
upstream Ballet project on your behalf (if you attempt to submit features).

![Authenticate with GitHub](docs/_static/auth_with_github_anon.gif)

Alternately, you can provide a personal access token directly using the
configuration approaches below.

## Configure

The extension ties into the same configuration system as Jupyter [Lab] itself.
You can configure the extension with command line arguments or via the
config file, just like you configure Jupyter Notebook or Jupyter Lab.

### All configuration options

The following configuration options are available:

```
$ python -c 'from ballet_assemble.app import print_help;print_help()'

AssembleApp options
-----------------
--AssembleApp.access_token_timeout=<Int>
    Default: 60
    timeout to receive access token from server via polling
--AssembleApp.ballet_yml_path=<Unicode>
    Default: ''
    path to ballet.yml file of Ballet project (if Lab is not run from project
    directory)
--AssembleApp.debug=<Bool>
    Default: False
    enable debug mode (no changes made on GitHub), will read from
    $ASSEMBLE_DEBUG if present
--AssembleApp.github_token=<Unicode>
    Default: ''
    github access token, will read from $GITHUB_TOKEN if present
--AssembleApp.oauth_gateway_url=<Unicode>
    Default: 'https://github-oauth-gateway.herokuapp.com/'
    url to github-oauth-gateway server
```

### Command line arguments

Invoke Jupyter Lab with command line arguments providing config to the ballet
extension, for example:

```
jupyter lab --AssembleApp.debug=True
```

### Config file

1. Determine the path to your jupyter config file (you may have to create it
if it does not exist):

    ```bash
    touch "$(jupyter --config-dir)/jupyter_notebook_config.py"
    ```

2. Append desired config to the end of the file, for example:

    ```python
    c.AssembleApp.debug = True
    ```

## Troubleshoot

If you are see the frontend extension but it is not working, check
that the server extension is enabled:

```bash
jupyter serverextension list
```

If the server extension is installed and enabled but your not seeing
the frontend, check the frontend is installed:

```bash
jupyter labextension list
```

If it is installed, try:

```bash
jupyter lab clean
jupyter lab build
```

## Contributing

### Development Install

Running `make install-develop` will install necessary dependencies and set up the development environment. Alternatively, these steps can be be taken manually with the instructions below

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Move to ballet-assemble directory
# Install server extension with dev dependencies
pip install -e .[dev]
# Register server extension
jupyter serverextension enable --py ballet_assemble
# Install dependencies
jlpm
# Build Typescript source
jlpm build
# Link your development version of the extension with JupyterLab
jupyter labextension link .

# Rebuild Typescript source after making changes
jlpm build
# Rebuild JupyterLab after making any changes
jupyter lab build
```

You can watch the source directory and run JupyterLab in watch mode to watch for changes in the extension's source and automatically rebuild the extension and application.

```bash
# Watch the source directory in another terminal tab
jlpm watch
# Run jupyterlab in watch mode in one terminal tab
jupyter lab --watch
```

### Uninstall

```bash
pip uninstall ballet_assemble
jupyter labextension uninstall ballet-assemble
```

### Run
```bash
jupyter lab
```

### Release process

```
bumpversion <part>
make release
```

###Feature: Code Slicing
This feature allows to **backtrace all code dependencies** of a selected cell an **extract** them from a notebook.

The user receives an executable subset of code lines (the "slice") which only contains code that is needed for the computation of the selected cell. Note that code will be collected even if it does not define a feature definition.  

The slice can then be submitted to an upstream repository. 

The code-slicing feature can be activated upon **selecting a certain cell** and clicking the **"SLICE" button** in the toolbar.
 
**Limitations:**
- If the cells were executed out of order (i.e. cell 1 is a dependency of cell 2, but cell 2 dragged above cell 1) the code cannot be collected. 

- Unlike the gather tool, code cells that have been deleted are no candidates for slicing. For example, if a user creates these two cells but then deletes cell 1, its code content will not be considered for the slice.

## Credits

### Contributors

- Micah Smith (<micahs@mit.edu>)
- Andrea Ortner (<e11809650@student.tuwien.ac.at>)
