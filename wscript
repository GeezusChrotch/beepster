top = '.'
out = 'build'


def strip_bundled_source_maps(ctx):
    """Keep local webpack maps, but never embed them in an installable PBW."""
    import os
    import tempfile
    import zipfile

    for pbw_node in ctx.bldnode.ant_glob('*.pbw'):
        pbw_path = pbw_node.abspath()
        with zipfile.ZipFile(pbw_path, 'r') as source:
            if not any(name.endswith('.map') for name in source.namelist()):
                continue
            fd, temporary_path = tempfile.mkstemp(
                prefix='.beepster-pbw-', suffix='.tmp', dir=os.path.dirname(pbw_path))
            os.close(fd)
            try:
                with zipfile.ZipFile(temporary_path, 'w') as destination:
                    for entry in source.infolist():
                        if entry.filename.endswith('.map'):
                            continue
                        destination.writestr(entry, source.read(entry.filename))
                os.replace(temporary_path, pbw_path)
            finally:
                if os.path.exists(temporary_path):
                    os.unlink(temporary_path)


def options(ctx):
    ctx.load('pebble_sdk')


def configure(ctx):
    ctx.load('pebble_sdk')


def build(ctx):
    ctx.load('pebble_sdk')
    binaries = []
    cached_env = ctx.env
    for platform in ctx.env.TARGET_PLATFORMS:
        ctx.env = ctx.all_envs[platform]
        ctx.set_group(ctx.env.PLATFORM_NAME)
        app_elf = '{}/pebble-app.elf'.format(ctx.env.BUILD_DIR)
        ctx.pbl_build(source=ctx.path.ant_glob('src/c/**/*.c'), target=app_elf, bin_type='app')
        binaries.append({'platform': platform, 'app_elf': app_elf})
    ctx.env = cached_env

    ctx.set_group('bundle')
    ctx.pbl_bundle(
        binaries=binaries,
        js=ctx.path.ant_glob(['src/pkjs/**/*.js', 'src/pkjs/**/*.json']),
        js_entry_file='src/pkjs/index.js')
    ctx.add_post_fun(strip_bundled_source_maps)
