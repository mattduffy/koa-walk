const root = process.cwd()
console.log(root)

export const ctx = {
  app: {
    publicDir: `${root}/public`,
    root: `${root}`,
    state: {
      dirs: {
        public: {
          dir: `${root}/public`,
          accounts: `${root}/public/a`,
        },
        private: {
          dir: `${root}/private`,
          accounts: `${root}/private/a`,
        },
      },
    },
  },
}
