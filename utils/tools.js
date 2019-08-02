class USet extends Set {
  constructor(...args) {
    super(...args);
  }

  clone() {
    return new USet([...this]);
  }

  deleteIndex(index) {
    this.delete(this.getIndex(index));
    return this;
  }

  filter(fn) {
    const filtered = new USet();
    for (const value of this) {
      if (fn(value)) filtered.add(value);
    }
    return filtered;
  }

  find(fn) {
    for (const value of this) {
      if (fn(value)) return value;
    }
    return null;
  }

  first(n) {
    if (n !== undefined) {
      let values = new Array(Math.min(parseInt(n, 10), this.size));
      let i = 0;
      for (const value of this) {
        values[i++] = value;
        if (i >= n) break;
      }
      return values;
    } else {
      for (const value of this) {
        return value;
      }
    }
  }

  getIndex(index) {
    return [...this][index];
  }

  map(fn) {
    return [...this].map(fn);
  }

  random() {
    // Get a random element
    let index = Math.floor(Math.random() * this.size);
    let i = 0;
    for (const value of this) {
      if (index == i++) return value;
    }
  }

  reduce(fn, value) {
    return [...this].reduce(fn, value);
  }

  sort(fn) {
    return [...this].sort(fn);
  }
}

module.exports = {
  USet
}
