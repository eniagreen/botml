let context = {
  dialogues: new Map(),
  lists: new Map(),
  services: new Map(),
  variables: new Map(),
  workflows: new Map()
}

let stats = () =>
  Object.keys(context).map(key => {
    let size = context[key].size;
    return size > 0 ? `${size} ${key}` : undefined;
  }).filter(stat => stat !== undefined).join(', ')
;

let inspect = (what) => Array.from(context[what]).toString();

module.exports = { context, stats, inspect };
