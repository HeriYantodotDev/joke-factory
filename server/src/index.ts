import { app } from './app';
import { sequelize } from './config/database';

const PORT = 3000;

sequelize.sync();

app.listen(PORT, () => {
  console.log(
    `Listening to port ... ${PORT}`
  );
});
