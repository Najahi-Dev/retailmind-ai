export default async function (ctx:any) {
  return await ctx.db.query("organizations").collect();
}
